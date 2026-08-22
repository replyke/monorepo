import { useCallback, useEffect, useRef, useState } from "react";
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
  selectAccountsReady,
  selectAccountManagerRegistered,
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
  markPushBindingsForRebind,
  pushIdentifiersEqual,
} from "./reconcilePushBindings";

export interface UsePushRegistrationValues {
  /**
   * Requests permission, retrieves a token/subscription via the adapter,
   * and registers it server-side. Resolves to `false` (without throwing)
   * when permission is denied or the adapter can't produce an identifier —
   * both expected outcomes. Throws on a failed API call.
   *
   * On success it also records this device's identifier and turns push on for
   * every stored account that has never expressed a preference — so the first
   * `register()` on a device that already holds several accounts turns push on
   * for all of them. An account the user deliberately silenced stays silenced.
   *
   * Only the ACTIVE account is bound here. The others are marked as needing a
   * re-bind and are bound the next time the user switches into them, using the
   * live session that switch establishes. Binding them now would mean spending
   * each one's stored refresh token on a one-time-use exchange in the
   * background, which can permanently lock an account out if it is interrupted.
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
  const accountsReady = useSublaySelector(selectAccountsReady);
  const accountManagerRegistered = useSublaySelector(
    selectAccountManagerRegistered
  );
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

      // Read BEFORE the write below overwrites it. Whether this device's token
      // actually changed is what decides if the other accounts' bindings are
      // stale, and after `setDeviceIdentifier` that evidence is gone.
      const previousIdentifier =
        getState().sublay.accounts.deviceIdentifier ?? null;

      // Persisted, NOT cached in memory. The docs tell apps to call
      // `register()` on a deliberate user action and explicitly not on mount,
      // so an in-memory copy would be cold on nearly every launch while the
      // server-side binding lives on — and with a cold copy account removal
      // cannot unbind its push and the per-account toggle silently no-ops.
      dispatch(setDeviceIdentifier(identifier));

      // EVERY stored account that has never expressed a preference, not just
      // the active one — which is what this call has always documented and is
      // the only thing that keeps an upgrading install reachable.
      //
      // Binding is gated on an EXPLICIT `pushEnabled === true` (see
      // `accountOptedIntoPush`), and every entry written before that field
      // existed is absent. Without this loop those accounts would be neither
      // marked nor bound by anything, and opening them would not help either,
      // because nothing else ever writes the flag except a deliberate toggle.
      // `register()` is the deliberate, foregrounded, permission-granting
      // action for this device, so it is the right place to record what it
      // enabled — for all of it, not for one account.
      //
      // ABSENT ONLY. An account the user explicitly silenced keeps its `false`:
      // this call speaks for accounts that were never asked, not over accounts
      // that answered.
      //
      // RECORDED, not just applied: an account this call flips from "never
      // asked" to enabled is now REPORTED as push-enabled and has no server
      // binding — only the active account was registered above — so it needs
      // marking even when this device's identifier is unchanged. See the
      // marking call below.
      const newlyEnabled: string[] = [];
      for (const [userId, entry] of Object.entries(
        getState().sublay.accounts.accounts
      )) {
        if (entry.pushEnabled === undefined) {
          dispatch(setAccountPushEnabled({ userId, enabled: true }));
          newlyEnabled.push(userId);
        }
      }

      // `register()` OWNS the flag for the account it was called for. Without
      // this the legacy API fights the toggle: the row exists, the flag still
      // says whatever it said, and the next reconcile can immediately undo what
      // this call just did.
      dispatch(setAccountPushEnabled({ userId: user.id, enabled: true }));

      await persistAccountState();

      // One of exactly two moments the device token can be new. The active
      // account was just registered above; every OTHER opted-in account is
      // MARKED as needing a re-bind rather than having its stored credential
      // exchanged for a background session. Each is repaired on its next
      // activation.
      //
      // TWO REASONS AN ACCOUNT CAN NEED THIS, AND THEY ARE NOT THE SAME SET.
      //
      //   1. The identifier genuinely CHANGED — every opted-in background
      //      account's binding now points at a token this device no longer
      //      holds, so all of them are marked.
      //   2. The identifier is UNCHANGED but this call just flipped some
      //      accounts from "never asked" to enabled. Marking every opted-in
      //      account here would raise "notifications paused — open to resume"
      //      on accounts that are working perfectly, clearing only when each is
      //      individually opened. But the newly flipped ones are NOT working:
      //      they are reported enabled by the public predicate, they have no
      //      binding, and nothing else would ever create one — `register()`
      //      registered the ACTIVE account only, and the activation-time
      //      reconcile is what repairs a MARKED account. Leaving them unmarked
      //      is exactly the "a mark is never dropped for something that needed
      //      repairing" invariant this seam is built on, broken.
      //
      // A repeat `register()` that flips nothing still marks nothing, which is
      // the case the second-tap gate was written for.
      const identifierChanged = !pushIdentifiersEqual(
        previousIdentifier,
        identifier
      );
      if (identifierChanged || newlyEnabled.length > 0) {
        await markPushBindingsForRebind(
          { dispatch, getState, projectId },
          identifierChanged ? undefined : { accountIds: newlyEnabled }
        );
      }

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

      // RECORD IT. This value used to be fetched and discarded, which mattered
      // because `register()` was the only writer — and the previous release's
      // `register()` persisted nothing. An install that registered before this
      // release therefore has a live server-side binding and no stored
      // identifier, and every path that unbinds push is gated on having one:
      // sign-out, account removal and the per-account toggle all silently
      // no-op. This is one of the two ways such an install acquires one without
      // being told to call `register()` again (the other is the rotation
      // subscription below).
      //
      // The adapter's value wins over whatever was stored: it is the identifier
      // this call is about to deregister, so it is the one the server has rows
      // for.
      dispatch(setDeviceIdentifier(identifier));

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

      // MARK, do not re-bind. Every opted-in background account's binding now
      // points at a token this device no longer holds, and the only way to
      // repair one from here is to spend its stored refresh token on a
      // one-time-use exchange — in the background, for an account the user is
      // not looking at, up to four at a time. An interruption mid-exchange
      // locks that account out permanently. The mark is durable and the repair
      // happens on the account's next activation, where a live session already
      // exists. The active account is re-bound in here, on the spot, because
      // for it there is nothing to spend.
      await markPushBindingsForRebind({ dispatch, getState, projectId });
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
   * Gated on the ADAPTER supporting subscription, and on nothing else.
   *
   * It used to be gated on an identifier already being persisted, which was a
   * chicken-and-egg: this is the only path that can DISCOVER an identifier
   * without the app calling `register()` again, and the previous release's
   * `register()` persisted nothing — so on every upgrading install the gate
   * held closed against the one mechanism that would have opened it, and the
   * whole per-account push subsystem silently no-opped. `applyIdentifierChange`
   * already handles a `current === null` correctly: there is no previous
   * identifier to unbind, so it records the incoming one and re-binds.
   *
   * Apps whose adapter omits the subscription mount nothing, and NOTHING HERE
   * ASKS THE USER FOR ANYTHING — every adapter's implementation is
   * non-prompting by construction, and must stay that way. Expo and React
   * Native attach a passive OS listener (`addPushTokenListener`,
   * `onTokenRefresh`); the web reads the subscription the browser already
   * holds via `getSubscription()` and is forbidden from calling
   * `getDeviceIdentifier`, which subscribes and can prompt without a gesture.
   *
   * ⚠ HOW MUCH DISCOVERY THIS ACTUALLY BUYS DIFFERS BY PLATFORM, and only the
   * web case is immediate. The web implementation emits on mount, so an
   * upgrading install acquires an identifier on its next launch. The two native
   * listeners are ROTATION-ONLY — they emit when the OS hands over a NEW token
   * and never merely because someone subscribed — so a native upgrader whose
   * token does not rotate acquires nothing here and depends on `unregister()`.
   * On iOS under React Native it is narrower still: `onTokenRefresh` reports
   * FCM, while that adapter registers APNs, so APNs rotation is not reported by
   * this event at all (see `PushTokenAdapter` in `@sublay/react-native`).
   * Recorded as a known residual, not an oversight.
   *
   * The identifier's VALUE is deliberately not a dependency, so a rotation does
   * not tear down and re-mount the very subscription that reported it.
   */
  const applyIdentifierChangeRef = useRef(applyIdentifierChange);
  applyIdentifierChangeRef.current = applyIdentifierChange;

  useEffect(() => {
    if (!projectId) return;
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
  }, [projectId, adapter]);

  /**
   * Reads this device's CURRENT push identifier once on mount — on the
   * platforms where doing so cannot prompt.
   *
   * ⚠ THIS IS THE ONLY THING THAT CLOSES THE NATIVE UPGRADE GAP. Both native
   * subscriptions above are ROTATION-ONLY: they emit when the OS hands over a
   * NEW token and never merely because something subscribed. So an install
   * that registered before this SDK persisted device identifiers — the
   * previous release's `register()` stored nothing — has a live server-side
   * binding, no local identifier, and no event coming. Every path that UNBINDS
   * push is gated on having one (sign-out, account removal, the per-account
   * toggle), so on those installs all three silently no-op, for as long as the
   * token does not rotate: months, or never. It affects Expo and React Native
   * alike, not just React Native on iOS.
   *
   * The fix is small because the constraint was never universal. Only the WEB
   * adapter is forbidden from calling `getDeviceIdentifier` without a gesture
   * (`pushManager.subscribe()` can prompt); both native adapters read a value
   * the OS already holds — React Native's own subscription already re-derives
   * through it on every refresh. So the adapter declares the capability and
   * this reads it, instead of one platform's rule stranding the other two. Web
   * is unaffected: it declares nothing here and keeps covering the same ground
   * through its mount-emitting subscription.
   *
   * ONCE, and only after account storage has loaded. `applyIdentifierChange`
   * dispatches `setDeviceIdentifier` and persists the whole account map, so
   * running it before Phase A's read lands would race a map with no accounts in
   * it against the one being restored. `usePushRegistration` is a descendant of
   * the provider and React flushes child effects first, so the manager's
   * registration is not visible on the first pass either — hence the same
   * microtask-then-gate the store provider uses for its own bootstrap. An app
   * with no `AccountManager` at all (core used directly, no platform storage)
   * is not gated and reads immediately.
   */
  const [hasWaitedForManager, setHasWaitedForManager] = useState(false);
  const hasReadIdentifierRef = useRef(false);

  useEffect(() => {
    Promise.resolve().then(() => setHasWaitedForManager(true));
  }, []);

  useEffect(() => {
    if (!projectId) return;
    if (!adapter.canReadIdentifierWithoutPrompting) return;
    if (!hasWaitedForManager) return;
    if (accountManagerRegistered && !accountsReady) return;
    if (hasReadIdentifierRef.current) return;
    hasReadIdentifierRef.current = true;

    adapter
      .getDeviceIdentifier({ projectId })
      .then((identifier) => {
        // `null` is "nothing to report", and an identifier equal to the stored
        // one is a no-op inside `applyIdentifierChange` — so on the common case
        // (already registered, nothing rotated) this costs one adapter call and
        // changes nothing.
        if (identifier) return applyIdentifierChangeRef.current(identifier);
      })
      .catch((error) => {
        // Reported, never thrown: nothing asked for this and a failure must not
        // break a mount. The next launch, the next rotation and the next
        // `register()` all retry.
        handleError(
          error,
          "Failed to read this device's push identifier on mount"
        );
      });
  }, [
    projectId,
    adapter,
    hasWaitedForManager,
    accountManagerRegistered,
    accountsReady,
  ]);

  return { register, unregister, registering, unregistering };
}

export default usePushRegistration;
