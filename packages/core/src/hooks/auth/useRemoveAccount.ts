import { useCallback, useState } from "react";
import { useSublayDispatch, useSublaySelector } from "../../store/hooks";
import {
  selectAccounts,
  selectActiveAccountId,
  selectDeviceIdentifier,
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
  // Read from the slice, not from storage: this hook holds no `AccountStorage`
  // handle, which is why the identifier has a Redux home at all.
  const deviceIdentifier = useSublaySelector(selectDeviceIdentifier);
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
        // The device identifier rides along so the server deletes that
        // account's push binding in the same transaction as the token-family
        // destroy. Without one the request is byte-identical to the old one.
        const payload: Record<string, unknown> = {
          refreshToken: targetAccount.refreshToken,
        };
        if (deviceIdentifier) payload.pushDevice = deviceIdentifier;

        try {
          await axios.post(`/${projectId}/auth/sign-out`, payload);
        } catch (signOutError) {
          // ── The strictness is SCOPED TO UNBIND FAILURES. ──────────────────
          //
          // With a `pushDevice` in the request the atomic guarantee is live:
          // the server either removed the push binding and the token family
          // together or removed neither, and a failure means neither. Removing
          // locally anyway is the exact leak this work closes — the user keeps
          // receiving notifications from a removed account with the credential
          // needed to fix it already deleted. So: rethrow, tear nothing down.
          //
          // With NO `pushDevice` there is no unbind, so there is nothing for
          // the guarantee to protect, and the old best-effort behaviour is
          // kept deliberately. Broadening strictness here would be a real
          // regression rather than a hardening: `/auth/sign-out` answers 204
          // for every write and token failure when none is sent, so the only
          // thing left that can fail is the TRANSPORT — which would mean
          // an offline user, or any app on a project without the `push`
          // bundle, could no longer remove an account at all. That contradicts
          // the server's own rule that a user can ALWAYS sign out.
          if (deviceIdentifier) throw signOutError;
          handleError(
            signOutError,
            "Server sign-out failed during account removal",
          );
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
        handleError(err, "Failed to remove account");
        setError(
          err instanceof Error ? err.message : "Failed to remove account"
        );
        throw err;
      } finally {
        setIsRemoving(false);
      }
    },
    [dispatch, projectId, accounts, activeAccountId, deviceIdentifier]
  );

  return { removeAccount, isRemoving, error };
}
