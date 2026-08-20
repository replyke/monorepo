import { useMemo } from "react";
import { useSublaySelector } from "../../store/hooks";
import {
  selectAccounts,
  selectActiveAccountId,
  selectAccountLimitReached,
  selectSignedOut,
  type AccountSummary,
} from "../../store/slices/accountsSlice";

export interface UseAccountsReturn {
  accounts: AccountSummary[];
  activeAccount: AccountSummary | null;
  accountCount: number;
  /**
   * `true` when no account is active *because the user deliberately signed
   * out* (or a stored session turned out to be dead), as opposed to "nothing
   * has ever been selected". Both look like `activeAccount === null`; this is
   * what tells them apart, and it survives a relaunch.
   */
  signedOut: boolean;
  /**
   * `true` when an account was refused admission because the map was already
   * full. Clears on the next successful admission and on any removal. See
   * `useAddAccount` for how it differs from `canAddAccount`.
   */
  accountLimitReached: boolean;
}

export default function useAccounts(): UseAccountsReturn {
  const accountsMap = useSublaySelector(selectAccounts);
  const activeAccountId = useSublaySelector(selectActiveAccountId);
  const signedOut = useSublaySelector(selectSignedOut);
  const accountLimitReached = useSublaySelector(selectAccountLimitReached);

  return useMemo(() => {
    const accountSummaries = Object.values(accountsMap).map(
      (entry) => entry.user
    );
    const activeAccount = activeAccountId
      ? accountsMap[activeAccountId]?.user ?? null
      : null;

    return {
      accounts: accountSummaries,
      activeAccount,
      accountCount: accountSummaries.length,
      signedOut,
      accountLimitReached,
    };
  }, [accountsMap, activeAccountId, signedOut, accountLimitReached]);
}
