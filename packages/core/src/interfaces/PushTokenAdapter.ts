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
   * OPTIONAL. Reports that this device's push identifier has changed, so the
   * SDK can re-bind every enabled account onto the new one.
   *
   * Optional deliberately, because the platforms are genuinely asymmetric:
   *
   *  - **Expo / React Native** have a real OS event (`addPushTokenListener`,
   *    `onTokenRefresh`) and report a rotation immediately. React Native's
   *    event emits an FCM token while its adapter registers APNs on iOS, so
   *    that implementation ignores the emitted value and re-derives.
   *  - **Web has no in-page event at all**: `pushsubscriptionchange` fires
   *    inside the service worker the *integrator* registers, which the SDK
   *    cannot subscribe to. The web implementation therefore covers rotation by
   *    COMPARISON rather than notification — it reads the existing subscription
   *    once on mount and emits it if it differs. It must never call
   *    `getDeviceIdentifier`, which subscribes and can prompt with no user
   *    gesture.
   *  - A custom adapter may simply omit it; rotation then falls back to the
   *    next `register()`, which is the pre-existing behaviour.
   *
   * Emitting `null`, or an identifier equal to the stored one, is a no-op.
   * Returns an unsubscribe function.
   */
  subscribeToIdentifierChanges?(
    context: PushDeviceContext,
    onChange: (identifier: PushDeviceIdentifier | null) => void
  ): () => void;
}
