import { useCallback, useState } from "react";
import { useStore } from "react-redux";
import useProject from "../projects/useProject";
import { useSublayDispatch, useSublaySelector } from "../../store/hooks";
import {
  isAccountPushEnabled,
  setAccountPushEnabled,
  setAccountNeedsPushRebind,
  selectAccounts,
  selectAccountMapSnapshot,
} from "../../store/slices/accountsSlice";
import { persistAccountMapFor } from "../../config/accountStorage";
import { handleError } from "../../utils/handleError";
import type { SublayState } from "../../store/sublayReducers";
import { applyAccountPushBinding } from "./reconcilePushBindings";
import { AccountTransitionError } from "../auth/accountTransition";

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
      // Typed with the same discriminant `useSwitchAccount` and
      // `useRemoveAccount` throw: all three can be handed a stale id off a
      // switcher rendered before the map moved, and a caller that branches on
      // `accountNotFound` should not have to special-case this one hook by
      // matching on message text it does not own. Nothing was attempted and
      // nothing was marked — `credentialRejected` stays `false`.
      if (!getState().sublay.accounts.accounts[userId]) {
        throw new AccountTransitionError(
          `Account ${userId} not found`,
          false,
          true
        );
      }

      setIsUpdating(true);
      setError(null);

      try {
        // Server first. With no device identifier stored this is a clean no-op
        // — the device has never registered, so there is nothing bound and the
        // flag is pure intent for the next `register()` to honour.
        const bindingApplied = await applyAccountPushBinding(
          { dispatch, getState, projectId },
          userId,
          enabled
        );

        dispatch(setAccountPushEnabled({ userId, enabled }));

        // Whatever this account's binding needed, it has just had it — this
        // path binds or unbinds directly against the CURRENT device identifier
        // and only writes the flag once that succeeded. Leaving a stale
        // "needs re-binding" marker standing would report notifications as
        // paused on an account the user just deliberately silenced, with no
        // route to clear it: the marker is cleared by the activation-time
        // reconcile, which for a silenced account has nothing left to do.
        //
        // ONLY WHEN SOMETHING ACTUALLY WENT OUT. The no-op branch above — no
        // device identifier — resolves without a request, and clearing the
        // marker off that would say "repaired" about a binding nothing touched.
        // The flag above is still written either way: it is durable INTENT, and
        // with nothing bound there is nothing to misreport. The marker is the
        // opposite; it is a claim about server state.
        if (bindingApplied) {
          dispatch(setAccountNeedsPushRebind({ userId, needsRebind: false }));
        }

        // Awaited: the whole point of the flag is that it is DURABLE intent,
        // and reconciliation on the next launch reads it from storage.
        await persistAccountMapFor(
          projectId,
          selectAccountMapSnapshot(getState()),
        );
      } catch (err) {
        // WHICH STEP FAILED DECIDES WHAT SURVIVED, and this branch covers all
        // of them:
        //
        //  - the binding change threw → nothing was dispatched, the previous
        //    flag stands, and memory and server still agree.
        //  - the PERSIST threw → the binding change already succeeded and the
        //    flag IS written in memory. That is not a lie about server state
        //    (the header's invariant — never report enabled while nothing is
        //    bound — still holds, because the write only happens after the
        //    binding landed); what is missing is DURABILITY. The next launch
        //    reads the pre-toggle flag from storage, so the intent is lost
        //    rather than misreported, and the reconcile re-applies it.
        //
        // So do NOT roll the flag back here: on the persist failure it matches
        // the server, and reverting it would be the one variant that does
        // misreport. The rethrow is what tells the caller to retry.
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
