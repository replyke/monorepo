import { describe, it, expect, vi, afterEach } from "vitest";

import { subscribeToWebPushIdentifierChanges } from "./webPushRotation";

function makeSubscription(endpoint: string) {
  return {
    endpoint,
    getKey: (name: string) =>
      name === "p256dh"
        ? new Uint8Array([1, 2, 3]).buffer
        : new Uint8Array([4, 5, 6]).buffer,
  } as unknown as PushSubscription;
}

function stubServiceWorker(options: {
  registration: unknown;
  subscription: PushSubscription | null;
  readyNeverSettles?: boolean;
}) {
  const getSubscription = vi.fn().mockResolvedValue(options.subscription);
  const registration = options.registration
    ? { pushManager: { getSubscription } }
    : null;

  vi.stubGlobal("PushManager", class {});
  vi.stubGlobal("navigator", {
    serviceWorker: {
      getRegistration: vi.fn().mockResolvedValue(registration),
      ready: options.readyNeverSettles
        ? new Promise(() => {})
        : Promise.resolve(registration),
    },
  });

  return { getSubscription };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("subscribeToWebPushIdentifierChanges", () => {
  it("emits the subscription the browser already holds", async () => {
    stubServiceWorker({
      registration: {},
      subscription: makeSubscription("https://push.example/abc"),
    });

    const onChange = vi.fn();
    subscribeToWebPushIdentifierChanges({ projectId: "p" }, onChange);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toMatchObject({
      platform: "web",
      subscription: { endpoint: "https://push.example/abc" },
    });
  });

  it("does NOTHING when there is no existing subscription — it must never re-subscribe", async () => {
    const { getSubscription } = stubServiceWorker({
      registration: {},
      subscription: null,
    });

    const onChange = vi.fn();
    subscribeToWebPushIdentifierChanges({ projectId: "p" }, onChange);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(getSubscription).toHaveBeenCalled();
    // Re-subscribing here would fetch the VAPID key and call
    // pushManager.subscribe(), which can prompt on page load with no user
    // gesture.
    expect(onChange).not.toHaveBeenCalled();
  });

  it("does not hang when no service worker is registered", async () => {
    stubServiceWorker({
      registration: null,
      subscription: null,
      // `ready` would never settle — the getRegistration() probe is what keeps
      // this from leaving a permanently pending promise behind.
      readyNeverSettles: true,
    });

    const onChange = vi.fn();
    const unsubscribe = subscribeToWebPushIdentifierChanges(
      { projectId: "p" },
      onChange,
    );
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(onChange).not.toHaveBeenCalled();
    expect(() => unsubscribe()).not.toThrow();
  });

  it("is inert with no service worker API at all", () => {
    vi.stubGlobal("navigator", {});
    const onChange = vi.fn();
    expect(() =>
      subscribeToWebPushIdentifierChanges({ projectId: "p" }, onChange)(),
    ).not.toThrow();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("abandons an in-flight check after unsubscribe", async () => {
    stubServiceWorker({
      registration: {},
      subscription: makeSubscription("https://push.example/abc"),
    });

    const onChange = vi.fn();
    const unsubscribe = subscribeToWebPushIdentifierChanges(
      { projectId: "p" },
      onChange,
    );
    unsubscribe();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(onChange).not.toHaveBeenCalled();
  });
});
