import { useCallback, useEffect, useRef } from "react";
import { useStore } from "react-redux";
import useProject from "../projects/useProject";
import { useUser } from "../user";
import { useSublayDispatch, useSublaySelector } from "../../store/hooks";
import {
  useRegisterPushDeviceMutation,
  useDeregisterPushDeviceMutation,
} from "../../store/api/pushApi";
import {
  setDeviceIdentifier,
  setAccountPushEnabled,
  selectDeviceIdentifier,
  selectActiveAccountId,
  selectAccountMapSnapshot,
} from "../../store/slices/accountsSlice";
import { persistAccountMapFor } from "../../config/accountStorage";
import { handleError } from "../../utils/handleError";
import type { SublayState } from "../../store/sublayReducers";
import type {
  PushTokenAdapter,
  PushDeviceIdentifier,
} from "../../interfaces/PushTokenAdapter";
import {
  reconcileAllPushBindings,
  pushIdentifiersEqual,
} from "./reconcilePushBindings";

export interface UsePushRegistrationValues {
  /**
   * Requests permission, retrieves a token/subscription via the adapter,
   * and registers it server-side. Resolves to `false` (without throwing)
   * when permission is denied or the adapter can't produce an identifier —
   * both expected outcomes. Throws on a failed API call.
   *
   * On success it also records this device's identifier, marks the ACTIVE
   * account as push-enabled, and reconciles every other enabled stored account
   * onto the same device — so the first `register()` on a device that already
   * holds several accounts turns push on for all of them.
   */
  register: () => Promise<boolean>;
  /**
   * Unbinds the ACTIVE account from this device and durably silences it.
   *
   * This is a sticky per-account preference, not a one-shot unbind: the account
   * stays silenced across switches and relaunches until something turns it back
   * on (`register()`, or the per-account toggle). It does NOT clear the device
   * identifier — that is device state shared with every other stored account.
   */
  unregister: () => Promise<void>;
  registering: boolean;
  unregistering: boolean;
}

/**
 * Explicit, developer-triggered push registration — unlike account-token
 * restoration, requesting OS/browser push permission should never happen
 * silently on mount. Callers pass the adapter for their platform
 * (`expoPushTokenAdapter`, `reactNativePushTokenAdapter`, `webPushTokenAdapter`).
 *
 * The hook also mounts the adapter's optional device-token change subscription
 * — see the effect at the bottom.
 */
function usePushRegistration(
  adapter: PushTokenAdapter
): UsePushRegistrationValues {
  const { projectId } = useProject();
  const { user } = useUser();
  const dispatch = useSublayDispatch();
  const store = useStore<{ sublay: SublayState }>();
  const deviceIdentifier = useSublaySelector(selectDeviceIdentifier);
  const activeAccountId = useSublaySelector(selectActiveAccountId);
  const [registerPushDevice, { isLoading: registering }] =
    useRegisterPushDeviceMutation();
  const [deregisterPushDevice, { isLoading: unregistering }] =
    useDeregisterPushDeviceMutation();

  const getState = useCallback(() => store.getState(), [store]);

  // The change handler is registered once per mount and must see the CURRENT
  // identifier without re-subscribing every time one arrives.
  const deviceIdentifierRef = useRef(deviceIdentifier);
  deviceIdentifierRef.current = deviceIdentifier;
  const activeAccountIdRef = useRef(activeAccountId);
  activeAccountIdRef.current = activeAccountId;

  /** Writes the identifier / flag through Redux and waits for it to land. */
  const persistAccountState = useCallback(async () => {
    if (!projectId) return;
    try {
      await persistAccountMapFor(projectId, selectAccountMapSnapshot(getState()));
    } catch (error) {
      // The server-side outcome is already decided at this point, so a failed
      // write must not turn a successful (de)registration into a thrown error.
      // Phase C's own persist gets an unawaited second attempt on the same
      // state change.
      handleError(error, "Failed to persist push state");
    }
  }, [projectId, getState]);

  const register = useCallback(async (): Promise<boolean> => {
    if (!projectId || !user) {
      throw new Error("No project ID or authenticated user available");
    }

    try {
      const granted = await adapter.requestPermission();
      if (!granted) return false;

      const identifier = await adapter.getDeviceIdentifier({ projectId });
      if (!identifier) return false;

      await registerPushDevice({ projectId, ...identifier }).unwrap();

      // Persisted, NOT cached in memory. The docs tell apps to call
      // `register()` on a deliberate user action and explicitly not on mount,
      // so an in-memory copy would be cold on nearly every launch while the
      // server-side binding lives on — and with a cold copy account removal
      // cannot unbind its push and the per-account toggle silently no-ops.
      dispatch(setDeviceIdentifier(identifier));

      // `register()` OWNS the flag. Without this the legacy API fights the
      // toggle: the row exists, the flag still says whatever it said, and the
      // next reconcile can immediately undo what this call just did.
      dispatch(setAccountPushEnabled({ userId: user.id, enabled: true }));

      await persistAccountState();

      // One of exactly two moments the device token can be new, so this is a
      // legitimate bulk pass: every OTHER enabled stored account is re-bound
      // onto this identifier. Failures are logged per account inside — the
      // active account's registration above already succeeded, and that is what
      // `register()` reports on.
      await reconcileAllPushBindings({ dispatch, getState, projectId });

      return true;
    } catch (error) {
      handleError(error, "Failed to register for push notifications");
      throw error;
    }
  }, [
    projectId,
    user,
    adapter,
    registerPushDevice,
    dispatch,
    getState,
    persistAccountState,
  ]);

  const unregister = useCallback(async (): Promise<void> => {
    if (!projectId || !user) {
      throw new Error("No project ID or authenticated user available");
    }

    try {
      const identifier = await adapter.getDeviceIdentifier({ projectId });
      if (!identifier) return;

      // Flag first, and deliberately so. "Off" is the safe direction to write
      // ahead of the request: if the DELETE fails the account reads as silenced
      // while a binding survives, and the next reconcile removes it. The
      // opposite order is what must never happen — see the toggle hook, which
      // writes "on" only after its bind succeeds.
      dispatch(setAccountPushEnabled({ userId: user.id, enabled: false }));

      await deregisterPushDevice({ projectId, ...identifier }).unwrap();

      // The device identifier is NOT cleared here. It is device state, and one
      // account unregistering must not disable removal-deregistration, the
      // per-account toggle, or rotation detection for every other still-bound
      // account on this device.
      await persistAccountState();
    } catch (error) {
      handleError(error, "Failed to unregister from push notifications");
      throw error;
    }
  }, [
    projectId,
    user,
    adapter,
    deregisterPushDevice,
    dispatch,
    persistAccountState,
  ]);

  /**
   * Applies a device-token rotation reported by the platform.
   *
   * Closes a PRE-EXISTING bug: before this, a rotated token silently killed
   * push for the whole install until the app happened to call `register()`
   * again — with one account or five.
   */
  const applyIdentifierChange = useCallback(
    async (next: PushDeviceIdentifier | null) => {
      if (!projectId || !next) return;

      const current = deviceIdentifierRef.current;
      if (pushIdentifiersEqual(current, next)) return;

      // Best-effort unbind of the OLD identifier, for the ACTIVE account only.
      // Stale rows belonging to the other stored accounts are reaped by the
      // server's `permanently_invalid` pruning on their first failed send,
      // which is far cheaper than a rotating token exchange per account for
      // housekeeping.
      if (current && activeAccountIdRef.current) {
        try {
          await deregisterPushDevice({ projectId, ...current }).unwrap();
        } catch (error) {
          handleError(error, "Failed to unbind the previous push device token");
        }
      }

      dispatch(setDeviceIdentifier(next));
      deviceIdentifierRef.current = next;
      await persistAccountState();

      await reconcileAllPushBindings({ dispatch, getState, projectId });
    },
    [projectId, dispatch, getState, deregisterPushDevice, persistAccountState]
  );

  /**
   * Mounts the adapter's device-token change subscription.
   *
   * NOT mounted inside `register()`. The docs tell apps to call that on a
   * deliberate user action, so a listener installed there would exist only in
   * the session that least needs it and never again. Mounting here means any
   * app that has EVER registered gets rotation coverage on every launch.
   *
   * Gated on an identifier already being persisted — which is only checkable
   * because the identifier is persisted rather than in-memory. Apps that never
   * use push mount nothing, and nothing here asks the user for anything:
   * receiving a refreshed token is not a permission prompt.
   *
   * The dependency is the PRESENCE of an identifier, not its value, so a
   * rotation does not tear down and re-mount the very subscription that
   * reported it.
   */
  const hasDeviceIdentifier = Boolean(deviceIdentifier);
  const applyIdentifierChangeRef = useRef(applyIdentifierChange);
  applyIdentifierChangeRef.current = applyIdentifierChange;

  useEffect(() => {
    if (!projectId || !hasDeviceIdentifier) return;
    if (!adapter.subscribeToIdentifierChanges) return;

    const unsubscribe = adapter.subscribeToIdentifierChanges(
      { projectId },
      (next) => {
        applyIdentifierChangeRef.current(next).catch((error) => {
          handleError(error, "Failed to apply a push device token change");
        });
      }
    );

    return () => {
      unsubscribe?.();
    };
  }, [projectId, adapter, hasDeviceIdentifier]);

  return { register, unregister, registering, unregistering };
}

export default usePushRegistration;
