// Minting an access token for a NON-ACTIVE stored account.
//
// ⚠ THE MOST DANGEROUS HELPER IN THE SDK. Read this before touching it.
//
// `/auth/request-new-access-token` ROTATES: presenting a refresh token revokes
// it and issues a successor in the same family. Re-presenting a revoked token
// trips the server's reuse detection, which **destroys that account's entire
// token family** — the user is signed out of that account with no route back,
// because the credential needed to recover it is the one that was just
// invalidated.
//
// Two rules follow, and neither is optional:
//
//  1. THE SUCCESSOR MUST BE DURABLY STORED BEFORE THE MINT IS COMPLETE. The
//     write is AWAITED, through the same per-project mutex every other persist
//     goes through. Fire-and-forget is not acceptable here: if the process dies
//     between the server rotating and the map recording, the stored token is
//     already revoked and the next attempt destroys the family. The grace
//     window is narrower than it sounds — inside it the server returns the
//     family's live successor only if an unrevoked one exists, and otherwise
//     destroys the family within the window too.
//
//  2. IT BYPASSES THE SHARED API CLIENT. `baseApi`'s `prepareHeaders` (and
//     `axiosPrivate`'s request interceptor) always inject the *active*
//     account's token, and the auth gate would park the call across a switch.
//     This exchange must carry the TARGET account's credential in the body and
//     nothing else, so it goes out over the bare public axios instance, which
//     carries no interceptors at all.
//
// Single-flighted per (project, account) so two reconciliations racing for the
// same account cannot present the same refresh token twice — which is the
// reuse-detection trigger, self-inflicted.
//
// ⚠ THE SINGLE-FLIGHT BOUNDARY IS ONE JS CONTEXT. `inFlight` is module state,
// so it serializes racing callers inside a single app instance and nothing
// beyond it. Two browser tabs — each with its own module instance — that both
// remount after a subscription rotation can therefore each present the same
// stored non-active refresh token. What keeps that theoretical rather than
// live:
//
//   - The write mutex plus Phase D's cross-tab `storage` sync converge the tabs
//     on the successor.
//   - The server's ~30s grace window returns the family's live successor rather
//     than destroying it, when an unrevoked one exists.
//   - Reaching the bulk loop at all is rare, though for DIFFERENT reasons on
//     the two paths that reach it, and only one of them is user-initiated:
//     `register()` is a deliberate user action, so two tabs racing it is
//     already unusual. The rotation path is NOT user-initiated — on web it is
//     `subscribeToWebPushIdentifierChanges`, a comparison run from a mount
//     effect — but it is gated on `pushIdentifiersEqual` finding an ACTUAL
//     difference, so an ordinary mount never reaches the loop; only a genuine
//     rotation does, and only on the first tabs to observe it.
//
// It is also the SAME class of exposure the ordinary active-account refresh
// already carries across tabs. Read "cannot present the same token twice" as
// in-context, not absolute.
//
// TWO CALLERS by design, both of which are "spend THIS account's credential,
// out of band, without disturbing whatever session is currently live":
//
//   1. Push reconciliation for a non-active account (`reconcilePushBindings`),
//      via `mintAccountAccessToken` — it needs a bearer token and nothing else.
//   2. The validate step of an account transition (`accountTransition`), via
//      `leaseAccountSession` — it needs the whole exchange result, because the
//      proven session is then INSTALLED rather than thrown away, and it needs
//      the flight held until that install has happened.
//
// Do not widen it into a general "act as any stored account" capability.
//
// Both go through ONE single-flight entry per (project, account), and that
// sharing is load-bearing rather than incidental. The two callers can genuinely
// collide: a bulk reconcile (after `register()` or a device-token rotation) or
// a per-account push toggle can be minting for account X at the moment the user
// taps "switch to X" — X is non-active on both sides, so both compute the same
// key. Two independent exchanges there would present the same refresh token
// twice, which IS the reuse-detection trigger. Because the shared promise
// carries the full `MintedAccountSession`, the second caller can be served from
// the first caller's single rotation instead.

import axios from "../../config/axios";
import type { AppDispatch } from "../../store/types";
import type { SublayState } from "../../store/sublayReducers";
import {
  setAccountCredential,
  selectAccountMapSnapshot,
} from "../../store/slices/accountsSlice";
import { persistAccountMapFor } from "../../config/accountStorage";
import { readJwtExp } from "../../utils/jwt";
import type { AuthUser } from "../../interfaces/models/User";

export type GetSublayState = () => { sublay: SublayState };

export interface MintAccountAccessTokenArgs {
  dispatch: AppDispatch;
  getState: GetSublayState;
  projectId: string;
  /** The stored, non-active account to mint for. */
  userId: string;
}

/** Raised when a mint cannot be completed. Never carries the token itself. */
export class AccountTokenMintError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccountTokenMintError";
  }
}

/**
 * Everything one exchange produced for the target account.
 *
 * `refreshToken` is the token that is LIVE after the exchange — the successor
 * when the server rotated, the presented one when it did not. Callers that
 * install a session must use this value and never the token they passed in:
 * the one they passed in is, by then, revoked.
 */
export interface MintedAccountSession {
  accessToken: string;
  refreshToken: string;
  /** The profile the exchange returned, when it carried one. */
  user: AuthUser | null;
}

/**
 * A session held open across the caller's install, so nothing can rotate behind
 * it. See `leaseAccountSession`.
 */
export interface MintedAccountLease {
  session: MintedAccountSession;
  /**
   * **Must be called, from a `finally`.** Until it is, every further mint for
   * this account is served the same session rather than starting a new
   * exchange — which is the point, and also means a leaked lease pins a stale
   * session for the lifetime of the process.
   *
   * Idempotent.
   */
  release(): void;
}

/**
 * One in-flight exchange per `${projectId}:${userId}`.
 *
 * ⚠ THE ENTRY OUTLIVES THE EXCHANGE WHEN SOMEONE IS HOLDING IT. `holds` is what
 * closes the window between "the exchange resolved" and "the caller finished
 * installing what it returned" — see `leaseAccountSession` for why that window
 * is the dangerous one.
 */
interface Flight {
  promise: Promise<MintedAccountSession>;
  /** Outstanding leases. The entry is only evicted at zero. */
  holds: number;
  settled: boolean;
}

const inFlight = new Map<string, Flight>();

/** Test seam — the map above is module state shared across a whole run. */
export function resetAccountTokenMints(): void {
  inFlight.clear();
}

function flightKey(projectId: string, userId: string): string {
  return `${projectId}:${userId}`;
}

/** Evicts a settled flight once nobody is holding it open. */
function evictIfIdle(key: string, flight: Flight): void {
  if (!flight.settled || flight.holds > 0) return;
  if (inFlight.get(key) === flight) inFlight.delete(key);
}

/**
 * Starts the exchange, or joins the one already running.
 *
 * `hold` is incremented HERE, synchronously, before the caller awaits anything.
 * That ordering is what makes a lease work for a joiner as well as for the
 * caller that started the flight: by the time the exchange settles and asks
 * whether it may evict, every current leaseholder has already been counted.
 */
function startOrJoin(
  args: MintAccountAccessTokenArgs,
  hold: boolean
): { key: string; flight: Flight } {
  const key = flightKey(args.projectId, args.userId);

  let flight = inFlight.get(key);
  if (!flight) {
    const created: Flight = {
      holds: 0,
      settled: false,
      // `exchange` is async, so it runs synchronously as far as the POST before
      // yielding — nothing can observe the map between here and the `set`
      // below, which is what makes "one exchange per key" airtight rather than
      // merely likely.
      promise: undefined as never,
    };
    created.promise = exchange(args).finally(() => {
      created.settled = true;
      evictIfIdle(key, created);
    });
    inFlight.set(key, created);
    flight = created;
  }

  if (hold) flight.holds += 1;
  return { key, flight };
}

/**
 * The whole exchange result, single-flighted per (project, account).
 *
 * Use this when the session is only going to be READ — to authorize a request,
 * typically. A caller that INSTALLS the returned refresh token as the live
 * session must use `leaseAccountSession` instead.
 */
export function mintAccountSession(
  args: MintAccountAccessTokenArgs
): Promise<MintedAccountSession> {
  return startOrJoin(args, false).flight.promise;
}

/**
 * The same exchange, with the flight held open until the caller says it is
 * done.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY A LEASE AND NOT JUST A PROMISE
 * ─────────────────────────────────────────────────────────────────────────────
 * Without one, the flight is evicted the moment the exchange settles — before
 * the awaiting caller's continuation has even been scheduled. Anything that
 * asks for this account in that gap starts a SECOND exchange, which is a
 * perfectly legal rotation: it presents the successor S1 (already durably in
 * the map) and gets S2 back, writing S2 to the map.
 *
 * That is fine for the second caller and fatal for the first. The transition
 * core installs S1 into the auth slice, `useAccountSync` Phase B then rebuilds
 * the map entry from the live `refreshToken` — putting the revoked S1 back over
 * S2 and persisting it — and the next ordinary refresh presents a revoked
 * token. That trips reuse detection, which **destroys the account's whole token
 * family**. The user is signed out of that account with no route back.
 *
 * Re-reading the map at install time cannot fix this: the install runs
 * synchronously from teardown to `setTokens`, so a second exchange's response
 * can never land inside it. The only place to close the window is here — hold
 * the flight until the install has happened, so no second exchange can start at
 * all.
 *
 * **The work between acquiring and releasing must contain no `await`.** A lease
 * is a lock on this account's credential; holding it across I/O would stall
 * every other mint for that account behind it, and a leaked lease pins a stale
 * session forever. The one caller (`activateStoredAccount`) installs
 * synchronously and releases in a `finally`.
 *
 * A failed exchange releases its own hold before rejecting — there is no
 * session to install, so there is nothing to protect.
 */
export async function leaseAccountSession(
  args: MintAccountAccessTokenArgs
): Promise<MintedAccountLease> {
  const { key, flight } = startOrJoin(args, true);

  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    flight.holds -= 1;
    evictIfIdle(key, flight);
  };

  try {
    const session = await flight.promise;
    return { session, release };
  } catch (error) {
    release();
    throw error;
  }
}

/**
 * Just the bearer token — for callers that only need to authorize a request as
 * this account. Shares the same single flight, so a reconcile and a transition
 * racing for the same account cost ONE rotation between them.
 */
export function mintAccountAccessToken(
  args: MintAccountAccessTokenArgs
): Promise<string> {
  return mintAccountSession(args).then((session) => session.accessToken);
}

async function exchange({
  dispatch,
  getState,
  projectId,
  userId,
}: MintAccountAccessTokenArgs): Promise<MintedAccountSession> {
  const entry = getState().sublay.accounts.accounts[userId];

  if (!entry?.refreshToken) {
    throw new AccountTokenMintError(
      `No stored refresh token for account ${userId}.`
    );
  }

  const response = await axios.post(
    `/${projectId}/auth/request-new-access-token`,
    { refreshToken: entry.refreshToken }
  );

  const accessToken: string | undefined = response.data?.accessToken;
  const successor: string | undefined = response.data?.refreshToken;
  const user: AuthUser | null = response.data?.user ?? null;

  // RE-READ AFTER THE AWAIT. The entry read at the top of this function is a
  // snapshot from before a network round trip, and an account can be removed
  // (`removeAccount`, `clearAllAccounts`) while that round trip is in flight —
  // a background reconcile overlapping a removal on an account-management
  // screen is the ordinary way it happens.
  //
  // Writing anyway used to RESURRECT the removed account: `upsertAccount`
  // creates when the key is absent, so the map got a fresh entry carrying a
  // live successor token and the user's summary, and the account was fully
  // usable again — the sign-out that removed it spent the OLD token, not this
  // successor.
  //
  // Nothing is written and the exchange FAILS rather than resolving. Returning
  // a session here would hand the caller a live credential for an account that
  // no longer exists, which is the same exposure by a different route.
  if (!getState().sublay.accounts.accounts[userId]) {
    throw new AccountTokenMintError(
      `Account ${userId} was removed while its token exchange was in flight.`
    );
  }

  if (successor && successor !== entry.refreshToken) {
    // In-memory first, so the revoked token stops being the one anything else
    // would present even if the write below fails.
    //
    // `setAccountCredential`, NOT `upsertAccount`: update-only, so even if the
    // entry disappears between the check above and this dispatch, the write is
    // a no-op instead of a resurrection. The check is what makes the FAILURE
    // correct; the reducer is what makes the WRITE safe.
    dispatch(
      setAccountCredential({
        userId,
        refreshToken: successor,
        tokenExpiresAt: readJwtExp(successor) ?? 0,
      })
    );

    // AWAITED — rule 1 in the header. `persistAccountMapFor` goes through the
    // per-project mutex, so this cannot interleave with Phase C's own write.
    //
    // The `For` variant, not the bare one: the storage slot is last-mount-wins
    // across the whole process, so with two providers mounted for two different
    // projects the bare version would write this successor under the OTHER
    // project's key and resolve happily — reporting a completed mint while a
    // server-revoked token stays live on disk. It refuses instead.
    //
    // A rejection here means the successor is in memory but not on disk. That
    // is reported to the caller rather than swallowed: treating an unpersisted
    // rotation as a completed mint is precisely how an interrupted operation
    // ends up presenting a revoked token later. The state dispatch above still
    // stands, so Phase C's own persist gets a second, unawaited attempt.
    try {
      await persistAccountMapFor(projectId, selectAccountMapSnapshot(getState()));
    } catch (error) {
      throw new AccountTokenMintError(
        `Rotated the refresh token for account ${userId} but could not persist it: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  if (!accessToken) {
    throw new AccountTokenMintError(
      `The token exchange for account ${userId} returned no access token.`
    );
  }

  // `successor ?? entry.refreshToken` and not the presented token blindly: the
  // presented one is revoked the moment the server answers, so returning it
  // when a successor exists would hand the caller a dead credential to install.
  return { accessToken, refreshToken: successor ?? entry.refreshToken, user };
}
