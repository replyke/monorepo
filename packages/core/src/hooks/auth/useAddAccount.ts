import { useCallback } from "react";
import { useSublayDispatch, useSublaySelector } from "../../store/hooks";
import { resetAuth } from "../../store/slices/authSlice";
import { clearUser } from "../../store/slices/userSlice";
import {
  selectAccounts,
  selectAccountLimitReached,
  MAX_ACCOUNTS,
} from "../../store/slices/accountsSlice";
import { baseApi } from "../../store/api/baseApi";
import { resetAccountScopedState } from "../../store/actions";

export interface UseAddAccountReturn {
  addAccount: () => void;
  /**
   * Whether there is room for another account right now — a *predicate*,
   * derived from the map size on every render. Use it to enable/disable an
   * "Add account" affordance before the user commits to anything.
   */
  canAddAccount: boolean;
  /**
   * Whether an admission was actually *refused* because the map was full — an
   * *event*, latched in the store until the next successful admission or any
   * removal. Use it to render the error after a sign-in was rejected at the
   * cap, including on the OAuth paths, whose entry point is synchronous and so
   * has no call to reject.
   *
   * The two answer different questions: `canAddAccount` is "may I offer this?",
   * `accountLimitReached` is "did this just fail?".
   */
  accountLimitReached: boolean;
}

export default function useAddAccount(): UseAddAccountReturn {
  const dispatch = useSublayDispatch();
  const accounts = useSublaySelector(selectAccounts);
  const accountLimitReached = useSublaySelector(selectAccountLimitReached);
  const canAddAccount = Object.keys(accounts).length < MAX_ACCOUNTS;

  const addAccount = useCallback(() => {
    if (!canAddAccount) return;

    // ── LOCAL ONLY. NOTHING HERE MAY REACH THE SHARED ACCOUNT MAP. ──────────
    //
    // Opening the sign-in screen is this surface's state, not the device's.
    // The account map is persisted and, on web, broadcast to every other tab
    // through `useAccountSync` Phase D — so anything written here is an
    // instruction to every other tab as well.
    //
    // This used to dispatch `setActiveAccount(null)` and `setSignedOut(true)`.
    // Phase C persisted that map, Phase D delivered it to the other tabs, and
    // each of them read "nobody is active" as a sign-out and tore its own
    // session down — persisted, and surviving a reload. MERELY OPENING the
    // add-account screen signed the user out everywhere else, and abandoning
    // the flow left them that way.
    //
    // Note that dropping the `signedOut` flag ALONE would not have fixed it:
    // Phase D derives "nobody is active" from `activeAccountId` too
    // (`!map.signedOut && map.activeAccountId ? … : null`), so the null
    // selection was a second, independent teardown signal. Both had to stop
    // being written.
    //
    // WHAT THE FLAG WAS FOR, AND WHY LEAVING IT OUT IS SAFE. It existed
    // because clearing the selection made a persisted `activeAccountId: null`,
    // which Phase A's first-account fallback reads as "nothing was ever
    // picked" — so abandoning the flow and quitting landed the user in the
    // OLDEST remembered account on the next launch. With the selection left
    // alone there is no null to disambiguate: the map still names the account
    // the user was in, and that is the one the next launch restores. The bug
    // stays fixed, and by a shorter route.
    //
    // "Selected, with no live session" is already this codebase's canonical
    // shape for *stepped out without signing out* — `refuseAtAccountLimit`
    // lands on exactly this state after a refused admission (by the same route:
    // it unwinds the session and leaves the selection untouched, rather than
    // writing one back), and a launch that cannot reach the server leaves it
    // deliberately. `useSwitchAccount` has an explicit `hasLiveSession` check
    // for it, so re-tapping the account the user came from signs them back into
    // it instead of no-opping.
    dispatch(resetAuth());
    dispatch(clearUser());
    dispatch(baseApi.util.resetApiState());
    // The outgoing account's feature state must not survive into the account
    // the user is about to sign into.
    dispatch(resetAccountScopedState());
  }, [dispatch, canAddAccount]);

  return { addAccount, canAddAccount, accountLimitReached };
}
