import { useCallback, useState } from "react";
import { useStore } from "react-redux";
import { useSublayDispatch, useSublaySelector } from "../../store/hooks";
import type { SublayState } from "../../store/sublayReducers";
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
  // The transition core validates the target's stored credential before it
  // tears anything down, which means reading the stored entry and writing the
  // rotated successor back — neither reachable through `dispatch` alone.
  const store = useStore<{ sublay: SublayState }>();
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
        // The whole sequence lives in the transition core, which validates the
        // target's stored credential BEFORE tearing anything down. A dead
        // credential REJECTS here and leaves the current session completely
        // untouched — it used to sign the user out of the account they were
        // happily using, because teardown ran first.
        await activateStoredAccount({
          dispatch,
          getState: () => store.getState(),
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
    [dispatch, store, projectId, accounts, activeAccountId]
  );

  return { switchAccount, isSwitching, error };
}
