import { Platform } from "react-native";
import messaging from "@react-native-firebase/messaging";
import { handleError } from "@sublay/core";
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

  // Neither `getToken()` nor `getAPNSToken()` prompts — permission was already
  // granted by the time any token exists — which the refresh handler below
  // already relies on when it re-derives through `getDeviceIdentifier`.
  // Declaring it lets core read the current identifier ONCE ON MOUNT instead of
  // waiting for `onTokenRefresh`, and that matters most here: the event carries
  // an FCM token, so an APNs rotation on iOS never raises it at all, and an
  // install that registered before this SDK persisted identifiers would sit
  // with a live server-side binding it has no local identifier to unbind.
  canReadIdentifierWithoutPrompting: true,

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
        .catch((error) => {
          // REPORT IT, and emit nothing. `onChange(null)` is core's "no change"
          // signal, so answering a FAILED re-derivation with it told the SDK
          // the device token was unchanged when the truth is that nobody knows
          // — leaving the device bound to a token the OS has already replaced,
          // with no delivery, no error and no trace. The next rotation or
          // `register()` retries.
          handleError(
            error,
            "Failed to re-derive this device's push identifier after a token refresh"
          );
        });
    });
  },
};
