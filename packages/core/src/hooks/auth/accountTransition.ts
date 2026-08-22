import type { AppDispatch } from "../../store/types";
import {
  setTokens,
  setUser,
  resetAuth,
  setInitialized,
} from "../../store/slices/authSlice";
import {
  setUser as setUserInUserSlice,
  clearUser,
} from "../../store/slices/userSlice";
import {
  setActiveAccount,
  setAccountNeedsReauth,
  setSignedOut,
} from "../../store/slices/accountsSlice";
import { baseApi } from "../../store/api/baseApi";
import { resetAccountScopedState } from "../../store/actions";
import {
  leaseAccountSession,
  type GetSublayState,
  type MintedAccountLease,
} from "../push/mintAccountAccessToken";
import { isCredentialRejection } from "../../utils/credentialRejection";

/**
 * The account-transition core.
 *
 * One sequence — validate → tear down → select → install — shared by every path
 * that makes a stored account the active one.
 *
 * **A plain function, deliberately not a hook.** The same sequence is needed
 * from `useSwitchAccount` (a hook), from `oauthCore` (a plain module), and from
 * the thunk bodies in `authThunks` — neither of the last two can call a hook,
 * so a `useAccountTransition` would have left them re-implementing it, which is
 * how the unwrap bug came to exist in six places at once.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * VALIDATE BEFORE COMMIT — why the order is what it is
 * ─────────────────────────────────────────────────────────────────────────────
 * This used to run teardown FIRST and only then discover whether the incoming
 * account's stored credential still worked. Because teardown is destructive,
 * switching to an account whose refresh token had died signed the user out of
 * the account they were happily using — and the rollback could only put the
 * *selection* back, never the session, because by then the outgoing account's
 * tokens were already gone.
 *
 * The credential is now proven out of band first, through
 * `leaseAccountSession`, which touches nothing the live session depends on.
 * Only once it answers does anything get torn down. A failure is therefore a
 * complete no-op against the current session: the call rejects, the user stays
 * exactly where they were, and the dead account is marked `needsReauth` so a
 * switcher can show it as needing a sign-in.
 *
 * **The LEASE, specifically — not the plain `mintAccountAccessToken`.** That is
 * the non-holding variant, and using it here would release the single flight
 * the instant the exchange settled, reopening the window this design exists to
 * close: something else could rotate again before the install landed, leaving
 * the live session holding a revoked token.
 *
 * Two things can be that "something else". A second transition into the same
 * account — `activateStoredAccount` is exported and has no re-entrancy guard of
 * its own, while `useSwitchAccount`'s in-progress flag is per-hook-instance
 * state set inside the async callback, so a double tap or two mounted switchers
 * both get through. And the per-account push toggle, which exchanges a stored
 * credential whenever the account it targets is not the active one. Push
 * reconciliation used to be a third; it no longer exchanges anything. See
 * `leaseAccountSession`.
 *
 * **The rotation count is unchanged.** The old order refreshed after the swap;
 * this one refreshes before it. One exchange either way — the validate step IS
 * the session-establishing exchange, not an extra probe. If this ever grows a
 * second exchange, that is a bug: the refresh endpoint rotates, and presenting
 * a revoked token destroys the account's whole token family.
 *
 * **Teardown still sits immediately before the install.** It exists to stop one
 * account's cached data rendering under another's name, and the gap between
 * them is where that can happen. Validating first does not widen that gap —
 * steps 2 and 3 below run back to back with no `await` between them.
 */

export const ACCOUNT_TRANSITION_FAILED_MESSAGE =
  "Could not restore the session for this account. Please sign in again.";

/**
 * Thrown when the incoming account's stored refresh token could not be
 * exchanged for a live session. Carries the underlying reason as `message` when
 * the server gave one.
 *
 * `credentialRejected` distinguishes "the server refused this credential" —
 * expired, revoked, reuse-detected, invalidated by a password change or a
 * remote sign-out-all — from "we could not reach the server" or "the rotation
 * could not be persisted". Only the first means the account needs a re-auth;
 * treating a flaky network as a dead account would tell users to sign in again
 * every time they lost signal.
 */
export class AccountTransitionError extends Error {
  readonly credentialRejected: boolean;

  constructor(
    message: string = ACCOUNT_TRANSITION_FAILED_MESSAGE,
    credentialRejected: boolean = false
  ) {
    super(message);
    this.name = "AccountTransitionError";
    this.credentialRejected = credentialRejected;
  }
}

export interface ActivateStoredAccountArgs {
  dispatch: AppDispatch;
  /**
   * The store's `getState`. Required: the validate step reads the target's
   * stored entry and has to write the rotated successor back through the same
   * persist path every other rotation goes through, and neither is reachable
   * from `dispatch` alone.
   */
  getState: GetSublayState;
  projectId: string;
  /** The account being switched INTO. Must already be in the accounts map. */
  userId: string;
  /**
   * That account's stored refresh token, as the caller read it.
   *
   * A consistency check, not the token that gets spent: the exchange reads the
   * entry from the store, because the entry is what the rotated successor has
   * to be written back into. An empty or missing value here fails the call
   * before any network request, which is the corrupt-map case (an interrupted
   * write, a hand-composed map) that used to report success with no session.
   */
  refreshToken: string;
  /**
   * The account that was active before this call. Retained for source
   * compatibility and for callers that log it; with validate-before-commit
   * there is no longer a rollback that needs it, because a failure never
   * changes the selection in the first place.
   */
  previousActiveAccountId?: string | null;
}

/**
 * Makes `userId` the active account and establishes its session.
 *
 * Resolves with the fresh access token.
 *
 * **Rejects** — with an `AccountTransitionError` — when the target's stored
 * credential cannot be exchanged for a session, and in that case **nothing has
 * been touched**: whatever session was live before the call is still live, with
 * its tokens, its user and its caches intact. The rejection is the only thing
 * that happened, plus a `needsReauth` marker on the target entry when the
 * server was the one that refused.
 *
 * The target's entry always survives a failure — it is the affordance an app
 * needs to prompt a re-auth for that account.
 */
export async function activateStoredAccount({
  dispatch,
  getState,
  projectId,
  userId,
  refreshToken,
}: ActivateStoredAccountArgs): Promise<string> {
  const stored = getState().sublay.accounts.accounts[userId];

  // A map that carries no usable credential for this account is the
  // `fulfilled`-with-`undefined` case the old unwrap guard missed: it never
  // reaches the network, so there is nothing to "fail". Fail it here, before
  // anything is torn down, and mark the account — an entry with no credential
  // is exactly an entry that needs a re-auth.
  if (!refreshToken || !stored?.refreshToken) {
    failTransition({ dispatch, getState, userId, credentialRejected: true });
    throw new AccountTransitionError(
      `No usable stored credential for account ${userId}.`,
      true
    );
  }

  // 1. VALIDATE — out of band, against the TARGET's credential, over the bare
  //    public axios instance. Nothing here reads or writes the live session:
  //    the shared API client would inject the *active* account's token and the
  //    auth gate would park the call, which is exactly why this exchange lives
  //    in its own helper. It rotates, and it persists the successor before it
  //    reports success.
  //
  //    A LEASE, not a plain mint. The exchange rotates, so once it resolves the
  //    map holds the successor this function is about to install. If the single
  //    flight were released at that moment, a push reconcile or a toggle for
  //    this same still-non-active account could start a second (legal) exchange
  //    in the microtask before the install, rotating again behind us — and the
  //    session would end up holding a revoked token that destroys the family on
  //    its next refresh. The lease keeps the flight closed until the install
  //    has happened. See `leaseAccountSession` for the full account.
  let lease: MintedAccountLease;
  try {
    lease = await leaseAccountSession({
      dispatch,
      getState,
      projectId,
      userId,
    });
  } catch (error) {
    const rejected = isCredentialRejection(error);
    failTransition({ dispatch, getState, userId, credentialRejected: rejected });
    throw new AccountTransitionError(readFailureReason(error), rejected);
  }

  try {
    // 2. TEAR DOWN the outgoing account's state — and only now, with the
    //    incoming session already in hand. Immediately before the install, so
    //    no request and no rendered slice can straddle the two identities.
    dispatch(resetAuth());
    dispatch(clearUser());
    dispatch(baseApi.util.resetApiState());
    dispatch(resetAccountScopedState());

    // 3. INSTALL. Synchronous, back to back with the teardown — there is no
    //    `await` anywhere in this block, which is both what keeps the
    //    signed-into-nothing window as narrow as the old order's and what makes
    //    the lease safe to hold across it.
    //
    //    `lease.session.refreshToken`, NOT the token that was presented: the
    //    exchange rotated, and the presented one is revoked. It is also the
    //    same value the map holds, and cannot drift from it, because the lease
    //    prevents any further rotation until step 4.
    dispatch(setActiveAccount(userId));
    dispatch(
      setTokens({
        accessToken: lease.session.accessToken,
        refreshToken: lease.session.refreshToken,
      })
    );
    if (lease.session.user) {
      dispatch(setUser(lease.session.user));
      dispatch(setUserInUserSlice(lease.session.user));
    }

    return lease.session.accessToken;
  } finally {
    // 4. RELEASE, always — a leaked lease would pin this stale session for
    //    every later mint of this account. From here on the account is active,
    //    so reconciliation takes the live-session branch and stops minting for
    //    it altogether.
    lease.release();

    // ALWAYS. This dispatch is what reopens the request-path auth gate
    // (`config/authGate.ts`); withholding it would park every outbound request
    // behind the 5s ready-timeout fallback, silently, for the rest of the
    // session. (`resetAuth` deliberately leaves `initialized` alone, so on the
    // happy path this is a no-op — it is here for the case where a dispatch
    // above throws, and for callers that transition during bootstrap.)
    dispatch(setInitialized(true));
  }
}

/**
 * The whole of what a failed transition changes.
 *
 * Two marks, and deliberately nothing else — no teardown, no selection change,
 * no token writes. Whatever session was live stays live.
 *
 *   - `needsReauth` on the target, but ONLY when the server refused the
 *     credential. A transport failure is not a dead account.
 *   - `signedOut`, but ONLY when nothing is active right now. Read from the
 *     store rather than from the caller's `previousActiveAccountId`, because
 *     the store is the authority on whether a session is at stake. This is the
 *     "user tapped a dead account from the picker while nothing was selected"
 *     case — after a sign-out, or on a launch that found nothing to restore:
 *     the selection is null and `signedOut` may still be false, so without this
 *     the next launch would silently activate whichever account happens to be
 *     first in the map, which is the stranding this work exists to remove. With
 *     a selection standing, the flag is left alone: nothing was signed out.
 *     (`addAccount()` no longer produces a null selection — it deliberately
 *     writes nothing to the shared map, since that map is broadcast to every
 *     other tab.)
 */
function failTransition({
  dispatch,
  getState,
  userId,
  credentialRejected,
}: {
  dispatch: AppDispatch;
  getState: GetSublayState;
  userId: string;
  credentialRejected: boolean;
}): void {
  if (credentialRejected) {
    dispatch(setAccountNeedsReauth({ userId, needsReauth: true }));
  }
  if (!getState().sublay.accounts.activeAccountId) {
    dispatch(setSignedOut(true));
  }
}

/** The server's reason, when it gave one, else the error's own message. */
function readFailureReason(error: unknown): string {
  const data = (
    error as { response?: { data?: { error?: unknown; message?: unknown } } }
  )?.response?.data;

  if (typeof data?.error === "string" && data.error) return data.error;
  if (typeof data?.message === "string" && data.message) return data.message;

  const message = (error as { message?: unknown } | null | undefined)?.message;
  return typeof message === "string" && message
    ? message
    : ACCOUNT_TRANSITION_FAILED_MESSAGE;
}
