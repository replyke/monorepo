import { handleError } from "@sublay/core";
import type { PushDeviceContext, PushDeviceIdentifier } from "@sublay/core";

// Device-token rotation coverage for the web.
//
// **Web has no in-page rotation event.** `pushsubscriptionchange` fires inside
// the service worker the *integrator* registers, which the SDK cannot subscribe
// to from page context. So the web is covered by COMPARISON rather than
// notification: on mount, read the subscription the browser already holds and
// emit it. Core compares it against the persisted identifier and re-binds every
// enabled account only if it actually differs.
//
// Two rules this file exists to obey:
//
//  1. NEVER CALL `getDeviceIdentifier()` HERE. That fetches the VAPID key and
//     calls `pushManager.subscribe()`, which can prompt on page load with no
//     user gesture if the user reset the site's permission. Only
//     `getSubscription()` is used, and a `null` result means "do nothing" — it
//     must never be treated as an invitation to re-subscribe.
//
//  2. NEVER AWAIT `navigator.serviceWorker.ready` UNCONDITIONALLY. It never
//     settles when no service worker is registered, so an app with conditional
//     registration would be left holding a permanently pending promise. The
//     `getRegistration()` probe below settles either way.

function toIdentifier(
  subscription: PushSubscription
): PushDeviceIdentifier | null {
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
}

/**
 * The web implementation of `PushTokenAdapter.subscribeToIdentifierChanges`.
 *
 * Runs one comparison pass and returns a canceller — there is no ongoing
 * listener to tear down, only an in-flight check to abandon if the component
 * unmounts first.
 */
export function subscribeToWebPushIdentifierChanges(
  _context: PushDeviceContext,
  onChange: (identifier: PushDeviceIdentifier | null) => void
): () => void {
  let cancelled = false;

  if (
    typeof navigator === "undefined" ||
    !navigator.serviceWorker ||
    typeof PushManager === "undefined"
  ) {
    return () => {};
  }

  void (async () => {
    try {
      // Probe first — see rule 2.
      const existing = await navigator.serviceWorker.getRegistration();
      if (!existing || cancelled) return;

      const registration = await navigator.serviceWorker.ready;
      if (cancelled) return;

      const subscription = await registration.pushManager.getSubscription();
      // No subscription: the user has not enabled push in this browser, or
      // revoked it. Do nothing — see rule 1.
      if (!subscription || cancelled) return;

      const identifier = toIdentifier(subscription);
      if (identifier && !cancelled) onChange(identifier);
    } catch (error) {
      // Best-effort — a browser that refuses to report its own subscription
      // falls back to the next `register()` — but NOT SILENT. This is the only
      // path by which the web discovers a rotated subscription, and an
      // installed base that never calls `register()` again depends on it
      // entirely, so a bare `catch {}` here turned "rotation coverage is dead
      // on this device" into an event with no trace anywhere.
      handleError(
        error,
        "Failed to read the existing web push subscription; rotation coverage is inactive until the next register()"
      );
    }
  })();

  return () => {
    cancelled = true;
  };
}
