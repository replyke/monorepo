import { Platform } from "react-native";
import messaging from "@react-native-firebase/messaging";
import type { PushTokenAdapter, PushDeviceIdentifier } from "@sublay/core";

// @react-native-firebase/messaging covers both platforms with one library:
// getToken() returns the FCM registration token (android), and
// getAPNSToken() returns the raw APNs device token (ios) — exactly what
// Sublay's server needs to dispatch directly via FCM/APNs with the
// project's own credentials, with no second APNs-specific library required.
export const reactNativePushTokenAdapter: PushTokenAdapter = {
  async requestPermission(): Promise<boolean> {
    const status = await messaging().requestPermission();
    return (
      status === messaging.AuthorizationStatus.AUTHORIZED ||
      status === messaging.AuthorizationStatus.PROVISIONAL
    );
  },

  async getDeviceIdentifier(): Promise<PushDeviceIdentifier | null> {
    if (Platform.OS === "ios") {
      const apnsToken = await messaging().getAPNSToken();
      return apnsToken ? { platform: "ios", token: apnsToken } : null;
    }

    const fcmToken = await messaging().getToken();
    return fcmToken ? { platform: "android", token: fcmToken } : null;
  },

  // ⚠ `onTokenRefresh` emits an **FCM** token, while this adapter registers the
  // **APNs** token on iOS — so the emitted value is the wrong type entirely
  // there, and trusting it would bind an FCM string as an APNs device token.
  // The handler therefore ignores what it is handed and RE-DERIVES through
  // `getDeviceIdentifier`, which is the only value that matches what was
  // registered. Neither `getToken()` nor `getAPNSToken()` prompts; permission
  // was already granted by the time any token exists.
  //
  // Consequence worth knowing: iOS APNs rotation is not reported by this event
  // at all, so it stays covered only by the next `register()`.
  subscribeToIdentifierChanges(_context, onChange): () => void {
    return messaging().onTokenRefresh(() => {
      reactNativePushTokenAdapter
        .getDeviceIdentifier({ projectId: _context.projectId })
        .then(onChange)
        .catch(() => onChange(null));
    });
  },
};
