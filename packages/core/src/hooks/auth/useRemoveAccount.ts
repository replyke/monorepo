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
import { AccountTransitionError } from "./accountTransition";
import axios from "../../config/axios";
import { handleError } from "../../utils/handleError";
import {
  isUnbindFailure,
  warnPushUnbindSkipped,
} from "../../utils/unbindFailure";

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
      // Typed for the same reason `useSwitchAccount` types it: "no such account
      // on this device" is a caller/stale-id problem, not a credential one, and
      // `accountNotFound` says so without the caller matching on message text.
      if (!targetAccount) {
        throw new AccountTransitionError(
          `Account ${userId} not found`,
          false,
          true
        );
      }

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
          // A 2xx is not a promise that the unbind happened: when the server
          // could not determine whether a binding exists it removes the session
          // anyway and names the skip in the body. Reported, never blocking —
          // see `utils/unbindFailure.ts`.
          const { data } = await axios.post(
            `/${projectId}/auth/sign-out`,
            payload
          );
          warnPushUnbindSkipped(data);
        } catch (signOutError) {
          // ── The strictness is SCOPED TO UNBIND FAILURES. ──────────────────
          //
          // An account is kept ONLY when the server actually refused to unbind
          // it, which `isUnbindFailure` reads off the response code rather than
          // inferring from the request. Sending a `pushDevice` says the client
          // *asked* for an unbind; it does not say one was attempted. Quota
          // exhaustion, pending deletion, migration, the rate limiter and body
          // validation all reject before the controller runs, and keying on the
          // request made every one of them make an account unremovable for any
          // user whose app had ever called `register()`.
          //
          // When the code IS one of the two, the atomic guarantee is live: the
          // server removed the push binding and the token family together or
          // removed neither, and this response means neither. Removing locally
          // anyway is the exact leak this work closes — the user keeps
          // receiving notifications from a removed account with the credential
          // needed to fix it already deleted. So: rethrow, tear nothing down.
          //
          // Everything else keeps the old best-effort behaviour deliberately.
          // Broadening strictness here would be a regression rather than a
          // hardening: it would mean an offline user, or a user on a project
          // that has merely blown its quota, could no longer remove an account
          // at all — against the server's own rule that a user can ALWAYS sign
          // out.
          if (isUnbindFailure(signOutError)) throw signOutError;
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
