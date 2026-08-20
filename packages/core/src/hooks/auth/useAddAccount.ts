import { useCallback } from "react";
import { useSublayDispatch, useSublaySelector } from "../../store/hooks";
import { resetAuth } from "../../store/slices/authSlice";
import { clearUser } from "../../store/slices/userSlice";
import {
  setActiveAccount,
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

    // Clear active auth state so the sign-in UI appears.
    // Existing accounts remain safely in the accounts map.
    // After the user signs in, useAccountSync auto-upserts the new account.
    dispatch(resetAuth());
    dispatch(clearUser());
    dispatch(setActiveAccount(null));
    dispatch(baseApi.util.resetApiState());
    // The outgoing account's feature state must not survive into the account
    // the user is about to sign into.
    dispatch(resetAccountScopedState());
  }, [dispatch, canAddAccount]);

  return { addAccount, canAddAccount, accountLimitReached };
}
