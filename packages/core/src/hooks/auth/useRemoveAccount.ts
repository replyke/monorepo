import { useCallback, useState } from "react";
import { useSublayDispatch, useSublaySelector } from "../../store/hooks";
import {
  selectAccounts,
  selectActiveAccountId,
  removeAccount as removeAccountAction,
} from "../../store/slices/accountsSlice";
import { resetAuth } from "../../store/slices/authSlice";
import { clearUser } from "../../store/slices/userSlice";
import { baseApi } from "../../store/api/baseApi";
import { resetAccountScopedState } from "../../store/actions";
import useProject from "../projects/useProject";
import axios from "../../config/axios";
import { handleError } from "../../utils/handleError";

export interface UseRemoveAccountReturn {
  removeAccount: ({ userId }: { userId: string }) => Promise<void>;
  isRemoving: boolean;
  error: string | null;
}

export default function useRemoveAccount(): UseRemoveAccountReturn {
  const dispatch = useSublayDispatch();
  const { projectId } = useProject();
  const accounts = useSublaySelector(selectAccounts);
  const activeAccountId = useSublaySelector(selectActiveAccountId);
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const removeAccount = useCallback(
    async ({ userId }: { userId: string }) => {
      if (!projectId) throw new Error("No projectId available");
      const targetAccount = accounts[userId];
      if (!targetAccount) throw new Error(`Account ${userId} not found`);

      setIsRemoving(true);
      setError(null);

      const isActiveAccount = userId === activeAccountId;

      try {
        // Best-effort server sign-out
        try {
          await axios.post(
            `/${projectId}/auth/sign-out`,
            { refreshToken: targetAccount.refreshToken }
          );
        } catch (signOutError) {
          handleError(signOutError, "Server sign-out failed during account removal");
        }

        // Remove from accounts map. When the removed account was the active
        // one the reducer leaves NOTHING active — no successor is selected and
        // no successor session is established. Removing an account is not a
        // request to be signed into a different one; the app renders its own
        // next screen. (This used to activate `remaining[0]` and refresh into
        // it, which silently landed the user inside the oldest account they
        // had ever added.)
        dispatch(removeAccountAction(userId));

        if (isActiveAccount) {
          dispatch(resetAuth());
          dispatch(clearUser());
          dispatch(baseApi.util.resetApiState());
          dispatch(resetAccountScopedState());
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to remove account"
        );
        throw err;
      } finally {
        setIsRemoving(false);
      }
    },
    [dispatch, projectId, accounts, activeAccountId]
  );

  return { removeAccount, isRemoving, error };
}
