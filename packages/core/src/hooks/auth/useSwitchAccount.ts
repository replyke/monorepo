import { useCallback, useState } from "react";
import { useSublayDispatch, useSublaySelector } from "../../store/hooks";
import {
  selectAccounts,
  selectActiveAccountId,
} from "../../store/slices/accountsSlice";
import useProject from "../projects/useProject";
import { activateStoredAccount } from "./accountTransition";

export interface UseSwitchAccountReturn {
  switchAccount: ({ userId }: { userId: string }) => Promise<void>;
  isSwitching: boolean;
  error: string | null;
}

export default function useSwitchAccount(): UseSwitchAccountReturn {
  const dispatch = useSublayDispatch();
  const { projectId } = useProject();
  const accounts = useSublaySelector(selectAccounts);
  const activeAccountId = useSublaySelector(selectActiveAccountId);
  const [isSwitching, setIsSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const switchAccount = useCallback(
    async ({ userId }: { userId: string }) => {
      if (!projectId) throw new Error("No projectId available");
      if (userId === activeAccountId) return;
      if (!accounts[userId]) throw new Error(`Account ${userId} not found`);

      setIsSwitching(true);
      setError(null);

      try {
        // The whole sequence lives in the transition core, which owns the
        // unwrap guard and the selection-only rollback. A failed refresh
        // REJECTS here — it used to resolve as if the switch had worked,
        // leaving the app pointed at an account with no session.
        await activateStoredAccount({
          dispatch,
          projectId,
          userId,
          refreshToken: accounts[userId].refreshToken,
          previousActiveAccountId: activeAccountId,
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to switch account"
        );
        throw err;
      } finally {
        setIsSwitching(false);
      }
    },
    [dispatch, projectId, accounts, activeAccountId]
  );

  return { switchAccount, isSwitching, error };
}
