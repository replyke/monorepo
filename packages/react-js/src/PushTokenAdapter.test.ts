import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoist all mocks so vi.mock() factory closures can reference them
// ---------------------------------------------------------------------------
const { mockFetch, mockSubscribe, mockGetKey, mockRequestPermission } =
  vi.hoisted(() => {
    const mockGetKey = vi.fn();
    const mockSubscribe = vi.fn();
    const mockRequestPermission = vi.fn();
    const mockFetch = vi.fn();
    return { mockFetch, mockSubscribe, mockGetKey, mockRequestPermission };
  });

vi.mock("@sublay/core", () => ({
  getApiBaseUrl: () => "https://api.sublay.io/v7",
}));

// Provide a consistent subscription shape
const makeSubscription = (overrides?: Partial<{ endpoint: string; p256dh: ArrayBuffer | null; auth: ArrayBuffer | null }>) => {
  const p256dhBytes = overrides?.p256dh ?? new Uint8Array([1, 2, 3]).buffer;
  const authBytes = overrides?.auth ?? new Uint8Array([4, 5, 6]).buffer;
  return {
    endpoint: overrides?.endpoint ?? "https://push.example.com/sub/abc123",
    getKey: mockGetKey.mockImplementation((key: string) => {
      if (key === "p256dh") return p256dhBytes;
      if (key === "auth") return authBytes;
      return null;
    }),
  };
};

// Set up browser globals before importing the module under test
beforeEach(() => {
  vi.stubGlobal("Notification", { requestPermission: mockRequestPermission });
  vi.stubGlobal("PushManager", {});
  vi.stubGlobal("fetch", mockFetch);

  const sub = makeSubscription();
  mockSubscribe.mockResolvedValue(sub);

  Object.defineProperty(globalThis, "navigator", {
    value: {
      serviceWorker: {
        ready: Promise.resolve({
          pushManager: { subscribe: mockSubscribe },
        }),
      },
    },
    configurable: true,
    writable: true,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

import { webPushTokenAdapter } from "./PushTokenAdapter";

const CTX = { projectId: "proj-abc" };

// ---------------------------------------------------------------------------
// requestPermission
// ---------------------------------------------------------------------------
describe("webPushTokenAdapter.canReadIdentifierWithoutPrompting", () => {
  it("is NOT declared — subscribing can prompt with no user gesture", () => {
    // The native adapters declare it because their `getDeviceIdentifier` reads
    // a token the OS already holds. This one calls `pushManager.subscribe()`,
    // which can raise a permission prompt. Declaring it here would have core
    // call it on every mount. Web needs it least anyway: its subscription emits
    // on mount from `getSubscription()`, which is what already lets an
    // upgrading web install acquire an identifier without another `register()`.
    expect(
      webPushTokenAdapter.canReadIdentifierWithoutPrompting,
    ).toBeUndefined();
  });
});

describe("webPushTokenAdapter.requestPermission", () => {
  it("returns true when granted", async () => {
    mockRequestPermission.mockResolvedValue("granted");
    await expect(webPushTokenAdapter.requestPermission()).resolves.toBe(true);
  });

  it("returns false when denied", async () => {
    mockRequestPermission.mockResolvedValue("denied");
    await expect(webPushTokenAdapter.requestPermission()).resolves.toBe(false);
  });

  it("returns false when Notification is not available", async () => {
    vi.stubGlobal("Notification", undefined);
    await expect(webPushTokenAdapter.requestPermission()).resolves.toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getDeviceIdentifier
// ---------------------------------------------------------------------------
describe("webPushTokenAdapter.getDeviceIdentifier", () => {
  it("returns a web subscription on success", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ publicKey: "dGVzdA" }), // base64 "test"
    });

    const result = await webPushTokenAdapter.getDeviceIdentifier(CTX);

    expect(result).not.toBeNull();
    expect(result!.platform).toBe("web");
    if (result && result.platform === "web") {
      expect(result.subscription.endpoint).toBe(
        "https://push.example.com/sub/abc123"
      );
      expect(typeof result.subscription.keys.p256dh).toBe("string");
      expect(typeof result.subscription.keys.auth).toBe("string");
    }

    // Verify the VAPID key endpoint was called with the right URL
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.sublay.io/v7/proj-abc/push-notifications/vapid-public-key"
    );
  });

  it("returns null when the server returns a non-ok response", async () => {
    mockFetch.mockResolvedValue({ ok: false });
    await expect(
      webPushTokenAdapter.getDeviceIdentifier(CTX)
    ).resolves.toBeNull();
    expect(mockSubscribe).not.toHaveBeenCalled();
  });

  it("returns null when publicKey is null (web-push not configured)", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ publicKey: null }),
    });
    await expect(
      webPushTokenAdapter.getDeviceIdentifier(CTX)
    ).resolves.toBeNull();
    expect(mockSubscribe).not.toHaveBeenCalled();
  });

  it("returns null when PushManager is unavailable (non-supporting browser)", async () => {
    vi.stubGlobal("PushManager", undefined);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ publicKey: "dGVzdA" }),
    });
    await expect(
      webPushTokenAdapter.getDeviceIdentifier(CTX)
    ).resolves.toBeNull();
  });

  it("returns null when subscription keys are missing", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ publicKey: "dGVzdA" }),
    });
    // Override so getKey returns null for both keys
    mockGetKey.mockReturnValue(null);
    const sub = {
      endpoint: "https://push.example.com/sub/abc123",
      getKey: mockGetKey,
    };
    mockSubscribe.mockResolvedValue(sub);

    await expect(
      webPushTokenAdapter.getDeviceIdentifier(CTX)
    ).resolves.toBeNull();
  });
});
