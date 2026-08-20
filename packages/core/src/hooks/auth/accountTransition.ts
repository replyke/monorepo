import type { AppDispatch } from "../../store/types";
import {
  setTokens,
  resetAuth,
  setInitialized,
} from "../../store/slices/authSlice";
import { clearUser } from "../../store/slices/userSlice";
import {
  setActiveAccount,
  setSignedOut,
} from "../../store/slices/accountsSlice";
import { requestNewAccessTokenThunk } from "../../store/slices/authThunks";
import { baseApi } from "../../store/api/baseApi";
import { resetAccountScopedState } from "../../store/actions";

/**
 * The account-transition core.
 *
 * One sequence — tear down → select → hand over the credential → refresh →
 * unwrap → roll back or land clean — shared by every path that makes a stored
 * account the active one.
 *
 * **A plain function, deliberately not a hook.** The same sequence is needed
 * from `useSwitchAccount` (a hook), from `oauthCore` (a plain module), and from
 * the thunk bodies in `authThunks` — neither of the last two can call a hook,
 * so a `useAccountTransition` would have left them re-implementing it, which is
 * how the unwrap bug came to exist in six places at once.
 */

export const ACCOUNT_TRANSITION_FAILED_MESSAGE =
  "Could not restore the session for this account. Please sign in again.";

/**
 * Thrown when the refresh that would establish the incoming account's session
 * did not produce an access token. Carries the underlying reason as `message`
 * when the server gave one.
 */
export class AccountTransitionError extends Error {
  constructor(message: string = ACCOUNT_TRANSITION_FAILED_MESSAGE) {
    super(message);
    this.name = "AccountTransitionError";
  }
}

export interface ActivateStoredAccountArgs {
  dispatch: AppDispatch;
  projectId: string;
  /** The account being switched INTO. Must already be in the accounts map. */
  userId: string;
  /** That account's stored refresh token. */
  refreshToken: string;
  /**
   * The account that was active before this call, so a failure can put the
   * selection back. `null` when nothing was active (e.g. after `addAccount()`).
   */
  previousActiveAccountId?: string | null;
}

/**
 * Makes `userId` the active account and establishes its session.
 *
 * Resolves with the fresh access token. **Rejects** — with an
 * `AccountTransitionError` — when the refresh fails, which includes the case
 * that used to pass silently: the thunk *fulfilling* with an `undefined`
 * payload. `rejected.match` alone does not catch that, so the guard is on the
 * payload. An entry with an empty or missing refresh token (a corrupt map, an
 * interrupted write, a map composed by hand) is exactly that case, and it used
 * to report success with no live session.
 *
 * **On failure it rolls back the SELECTION, not the session.** By the time a
 * refresh failure is known, `resetAuth`/`clearUser`/`resetApiState` have
 * already run and the outgoing account's access token is gone — there is
 * nothing left to restore it from that would not mean spending its refresh
 * token on a second network call that can fail in turn. The honest terminal
 * state is therefore "previous account selected again, app renders
 * signed-out": the entries all survive (the target account's entry is the
 * affordance an app needs to prompt a re-auth), only the live session does not.
 * With nothing to select back to, the signed-out flag is set so the next launch
 * lands at the account picker instead of silently activating whichever account
 * happens to be first in the map.
 */
export async function activateStoredAccount({
  dispatch,
  projectId,
  userId,
  refreshToken,
  previousActiveAccountId = null,
}: ActivateStoredAccountArgs): Promise<string> {
  // Tear down the outgoing account's state before anything points at the
  // incoming one, so no request and no rendered slice can straddle the two.
  dispatch(resetAuth());
  dispatch(clearUser());
  dispatch(baseApi.util.resetApiState());
  dispatch(resetAccountScopedState());

  dispatch(setActiveAccount(userId));
  dispatch(setTokens({ accessToken: null, refreshToken }));
  // Closes the request-path auth gate for the duration of the refresh.
  dispatch(setInitialized(false));

  try {
    const result = await dispatch(requestNewAccessTokenThunk({ projectId }));

    // The payload check is the whole point — see the docblock.
    if (
      !requestNewAccessTokenThunk.fulfilled.match(result) ||
      !result.payload
    ) {
      throw new AccountTransitionError(readRejectionReason(result));
    }

    return result.payload;
  } catch (error) {
    // Selection-only rollback.
    dispatch(resetAuth());
    dispatch(clearUser());
    dispatch(baseApi.util.resetApiState());
    dispatch(resetAccountScopedState());
    dispatch(setActiveAccount(previousActiveAccountId ?? null));
    if (!previousActiveAccountId) dispatch(setSignedOut(true));

    throw error instanceof Error ? error : new AccountTransitionError();
  } finally {
    // ALWAYS. This dispatch is what reopens the request-path auth gate
    // (`config/authGate.ts`); withholding it on the failure path would park
    // every outbound request behind the 5s ready-timeout fallback, silently,
    // for the rest of the session.
    dispatch(setInitialized(true));
  }
}

/** Pulls the server's reason off a rejected thunk action, when there is one. */
function readRejectionReason(result: {
  payload?: unknown;
  error?: { message?: string };
}): string | undefined {
  if (typeof result.payload === "string" && result.payload) {
    return result.payload;
  }
  return result.error?.message || undefined;
}
