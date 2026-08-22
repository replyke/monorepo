export type PushDevicePlatform = "ios" | "android" | "web";

export interface PushWebSubscriptionPayload {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

// Mirrors the server's register/deregister device body exactly (a token for
// ios/android, a Web Push subscription object for web) so a platform
// adapter's result can be spread straight into the API call.
export type PushDeviceIdentifier =
  | { platform: "ios" | "android"; token: string }
  | { platform: "web"; subscription: PushWebSubscriptionPayload };

export interface PushDeviceContext {
  projectId: string;
}

// One implementation per platform package (expo, react-native, react-js),
// parallel to AccountStorage. getDeviceIdentifier takes a context (mirroring
// AccountStorage's projectId param) because the web implementation needs the
// project's VAPID public key, fetched over the network, before it can build
// a subscription.
export interface PushTokenAdapter {
  requestPermission(): Promise<boolean>;
  getDeviceIdentifier(
    context: PushDeviceContext
  ): Promise<PushDeviceIdentifier | null>;
  /**
   * OPTIONAL, defaults to `false`. `true` declares that
   * `getDeviceIdentifier` reads a value the OS already holds and CANNOT prompt
   * the user for anything.
   *
   * When it is set, core calls `getDeviceIdentifier` ONCE on mount — with no
   * user gesture — and feeds the answer through the same path a rotation takes.
   * That is what closes the upgrade gap for native installs: both native
   * subscriptions are ROTATION-ONLY, so an install that registered before this
   * SDK stored device identifiers, and whose token then never rotates, would
   * otherwise never acquire one — and every path that UNBINDS push (sign-out,
   * account removal, the per-account toggle) is gated on having one, so all of
   * them silently no-op. Web covers the same ground a different way: its
   * subscription emits on mount from `getSubscription()`, which is why it does
   * not need this.
   *
   * ⚠ **Only set this when it is literally true.** The web adapter must NOT:
   * its `getDeviceIdentifier` calls `pushManager.subscribe()`, which can raise
   * a permission prompt with no user gesture behind it. Expo
   * (`getDevicePushTokenAsync`) and React Native (`getToken` / `getAPNSToken`)
   * both read what the OS already has — permission was granted before any
   * token existed — which is why the React Native subscription already
   * re-derives through `getDeviceIdentifier` on every refresh.
   *
   * Reading it costs nothing when no identifier has changed: an answer equal to
   * the stored one is a no-op, and `null` means "nothing to report".
   */
  canReadIdentifierWithoutPrompting?: boolean;

  /**
   * OPTIONAL. Reports this device's current push identifier, so the SDK can
   * re-bind the active account onto it and mark the others for re-binding.
   *
   * Optional deliberately, because the platforms are genuinely asymmetric —
   * and they differ in WHEN they emit, not only in how:
   *
   *  - **Web has no in-page event at all**: `pushsubscriptionchange` fires
   *    inside the service worker the *integrator* registers, which the SDK
   *    cannot subscribe to. The web implementation therefore covers rotation by
   *    COMPARISON rather than notification — it reads the subscription the
   *    browser already holds ONCE ON MOUNT and emits it, and core ignores it
   *    unless it differs from the stored one. It is the only implementation
   *    that emits without a rotation having happened, which is also what lets
   *    an install that has no stored identifier acquire one. It must never call
   *    `getDeviceIdentifier`, which subscribes and can prompt with no user
   *    gesture.
   *  - **Expo and React Native are ROTATION-ONLY.** Both attach a passive OS
   *    listener (`addPushTokenListener`, `onTokenRefresh`) that fires when the
   *    OS hands over a NEW token and never merely because something subscribed.
   *    A device whose token does not rotate emits nothing here — which on those
   *    platforms can be months, or never. That is what
   *    `canReadIdentifierWithoutPrompting` is for: both native adapters set it,
   *    so core reads the current identifier once on mount instead of waiting
   *    for a rotation that may never come.
   *  - **React Native on iOS is not covered by the EVENT at all.**
   *    `onTokenRefresh` reports an FCM token while that adapter registers the
   *    APNs one, so the event never carries the identifier that was actually
   *    registered. The implementation ignores the emitted value and re-derives
   *    through `getDeviceIdentifier`, which is correct — but an APNs rotation
   *    does not raise that event in the first place, so a rotation there is
   *    still only picked up by the mount-time read above, the next
   *    `register()`, or `unregister()` (which also records what it fetched).
   *  - A custom adapter may simply omit it; rotation then falls back to the
   *    next `register()`, which is the pre-existing behaviour.
   *
   * **Must not prompt.** Core mounts this on every launch, with no user
   * gesture, so every implementation has to reach its answer from state the OS
   * or browser already holds.
   *
   * Emitting `null`, or an identifier equal to the stored one, is a no-op — so
   * `null` means "nothing to report", never "the previous value is gone". An
   * implementation that FAILS should report the failure rather than emitting
   * `null`, which core cannot tell apart from "unchanged".
   *
   * Returns an unsubscribe function.
   */
  subscribeToIdentifierChanges?(
    context: PushDeviceContext,
    onChange: (identifier: PushDeviceIdentifier | null) => void
  ): () => void;
}
