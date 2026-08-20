import { useCallback, useState } from "react";
import { useStore } from "react-redux";
import useProject from "../projects/useProject";
import { useSublayDispatch, useSublaySelector } from "../../store/hooks";
import {
  isAccountPushEnabled,
  setAccountPushEnabled,
  selectAccounts,
  selectAccountMapSnapshot,
} from "../../store/slices/accountsSlice";
import { persistAccountMapFor } from "../../config/accountStorage";
import { handleError } from "../../utils/handleError";
import type { SublayState } from "../../store/sublayReducers";
import { applyAccountPushBinding } from "./reconcilePushBindings";

export interface SetAccountPushEnabledParams {
  /** Any account in the stored account map — it does not have to be active. */
  userId: string;
  enabled: boolean;
}

export interface UseAccountPushToggleValues {
  setAccountPushEnabled: (
    params: SetAccountPushEnabledParams
  ) => Promise<void>;
  /** Whether a given stored account currently wants push on this device. */
  isAccountPushEnabled: (userId: string) => boolean;
  isUpdating: boolean;
  error: string | null;
}

/**
 * Per-account, per-device push control — one switch per stored account.
 *
 * **Distinct from `useNotificationPreferences`**, and the two are not
 * alternatives. This decides *whether an account is bound to this device at
 * all*; notification preferences decide *which event types* a single signed-in
 * user receives. Silencing an account here removes its binding, so nothing
 * reaches this device for it regardless of its per-event-type settings.
 *
 * Works on accounts the user is not currently signed into — silencing a
 * non-active account unbinds it server-side without switching to it. That path
 * spends one rotating token exchange for the target account; it is safe to fail
 * there because nothing is destroyed: the account stays, the flag is unchanged,
 * and the user can retry.
 *
 * **The flag is written only AFTER the binding change succeeds.** The SDK must
 * never report an account as push-enabled while nothing is bound. What an app
 * renders on failure is the integrator's business; reporting the truth about
 * server state is not.
 */
export default function useAccountPushToggle(): UseAccountPushToggleValues {
  const dispatch = useSublayDispatch();
  const store = useStore<{ sublay: SublayState }>();
  const { projectId } = useProject();
  const accounts = useSublaySelector(selectAccounts);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setEnabled = useCallback(
    async ({ userId, enabled }: SetAccountPushEnabledParams) => {
      if (!projectId) throw new Error("No projectId available");

      const getState = () => store.getState();
      if (!getState().sublay.accounts.accounts[userId]) {
        throw new Error(`Account ${userId} not found`);
      }

      setIsUpdating(true);
      setError(null);

      try {
        // Server first. With no device identifier stored this is a clean no-op
        // — the device has never registered, so there is nothing bound and the
        // flag is pure intent for the next `register()` to honour.
        await applyAccountPushBinding(
          { dispatch, getState, projectId },
          userId,
          enabled
        );

        dispatch(setAccountPushEnabled({ userId, enabled }));

        // Awaited: the whole point of the flag is that it is DURABLE intent,
        // and reconciliation on the next launch reads it from storage.
        await persistAccountMapFor(
          projectId,
          selectAccountMapSnapshot(getState()),
        );
      } catch (err) {
        // The flag was never written, so the previous value stands.
        handleError(err, "Failed to update push notifications for account");
        setError(
          err instanceof Error
            ? err.message
            : "Failed to update push notifications for account"
        );
        throw err;
      } finally {
        setIsUpdating(false);
      }
    },
    [dispatch, store, projectId]
  );

  const isEnabled = useCallback(
    (userId: string) => {
      const entry = accounts[userId];
      return entry ? isAccountPushEnabled(entry) : false;
    },
    [accounts]
  );

  return {
    setAccountPushEnabled: setEnabled,
    isAccountPushEnabled: isEnabled,
    isUpdating,
    error,
  };
}
