import type {
  PushTokenAdapter,
  PushDeviceIdentifier,
  PushDeviceContext,
} from "@sublay/core";
import { getApiBaseUrl } from "@sublay/core";
import { subscribeToWebPushIdentifierChanges } from "./webPushRotation";

// Converts a URL-safe Base64 string (VAPID key format) to a Uint8Array,
// required by PushManager.subscribe({ applicationServerKey: ... }).
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export const webPushTokenAdapter: PushTokenAdapter = {
  async requestPermission(): Promise<boolean> {
    if (typeof Notification === "undefined") return false;
    const result = await Notification.requestPermission();
    return result === "granted";
  },

  async getDeviceIdentifier(
    context: PushDeviceContext
  ): Promise<PushDeviceIdentifier | null> {
    if (
      typeof navigator === "undefined" ||
      !navigator.serviceWorker ||
      typeof PushManager === "undefined"
    ) {
      return null;
    }

    const { projectId } = context;

    // VAPID public key is not secret — the server intentionally exposes it
    // unauthenticated so the browser can call pushManager.subscribe() before
    // the user has signed in.
    const res = await fetch(
      `${getApiBaseUrl()}/${projectId}/push-notifications/vapid-public-key`
    );
    if (!res.ok) return null;

    const { publicKey } = (await res.json()) as { publicKey: string | null };
    if (!publicKey) return null;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    const rawKey = subscription.getKey("p256dh");
    const rawAuth = subscription.getKey("auth");
    if (!rawKey || !rawAuth) return null;

    return {
      platform: "web",
      subscription: {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode(...new Uint8Array(rawKey))),
          auth: btoa(String.fromCharCode(...new Uint8Array(rawAuth))),
        },
      },
    };
  },

  // Comparison-on-load rather than an event, and it deliberately never calls
  // `getDeviceIdentifier` above — see `webPushRotation.ts` for why.
  subscribeToIdentifierChanges: subscribeToWebPushIdentifierChanges,
};
