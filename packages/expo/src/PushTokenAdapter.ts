import * as Notifications from "expo-notifications";
import type { PushTokenAdapter, PushDeviceIdentifier } from "@sublay/core";

/** Maps an expo-notifications DevicePushToken onto Sublay's identifier shape. */
function toIdentifier(devicePushToken: {
  type: string;
  data: unknown;
}): PushDeviceIdentifier | null {
  if (devicePushToken.type === "ios" || devicePushToken.type === "android") {
    return {
      platform: devicePushToken.type,
      token: devicePushToken.data as string,
    };
  }
  return null;
}

// Deliberately uses getDevicePushTokenAsync (the raw native APNs/FCM token),
// not getExpoPushTokenAsync (Expo's own push-relay token) — Sublay's server
// dispatches directly to APNs/FCM using the project's own credentials, so it
// needs the token those services recognize, not an Expo-relay token.
export const expoPushTokenAdapter: PushTokenAdapter = {
  async requestPermission(): Promise<boolean> {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
  },

  async getDeviceIdentifier(): Promise<PushDeviceIdentifier | null> {
    const devicePushToken = await Notifications.getDevicePushTokenAsync();
    return toIdentifier(devicePushToken);
  },

  // `getDevicePushTokenAsync` registers with APNs/FCM and hands back the token
  // the OS already holds — it does not ask the user for anything, which is
  // `requestPermissionsAsync`'s job above. Declaring that lets core read the
  // current identifier ONCE ON MOUNT rather than waiting for a rotation, which
  // is the only thing that closes the gap for an install that registered before
  // this SDK persisted identifiers: the listener below is rotation-only, so on
  // a device whose token never rotates it would otherwise emit nothing, and
  // every unbind path (sign-out, account removal, the per-account toggle) stays
  // silently no-op for want of a stored identifier.
  canReadIdentifierWithoutPrompting: true,

  // Expo is the clean case: `addPushTokenListener` emits exactly the
  // `DevicePushToken` shape `getDevicePushTokenAsync` returns, so the emitted
  // value can be used directly. Subscribing asks the user for nothing — a
  // refreshed token is delivered, not requested.
  subscribeToIdentifierChanges(_context, onChange): () => void {
    const subscription = Notifications.addPushTokenListener((token) => {
      onChange(toIdentifier(token));
    });

    return () => subscription.remove();
  },
};
