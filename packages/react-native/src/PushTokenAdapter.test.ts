import { describe, it, expect, vi, afterEach } from "vitest";

const {
  requestPermission,
  getToken,
  getAPNSToken,
  onTokenRefresh,
  PlatformMock,
  messagingFn,
} = vi.hoisted(() => {
  const requestPermission = vi.fn();
  const getToken = vi.fn();
  const getAPNSToken = vi.fn();
  const onTokenRefresh = vi.fn();
  const PlatformMock: { OS: "ios" | "android" } = { OS: "ios" };

  const messagingFn: any = vi.fn(() => ({
    requestPermission,
    getToken,
    getAPNSToken,
    onTokenRefresh,
  }));
  messagingFn.AuthorizationStatus = {
    NOT_DETERMINED: -1,
    DENIED: 0,
    AUTHORIZED: 1,
    PROVISIONAL: 2,
  };

  return {
    requestPermission,
    getToken,
    getAPNSToken,
    onTokenRefresh,
    PlatformMock,
    messagingFn,
  };
});

const handleError = vi.fn();

vi.mock("react-native", () => ({ Platform: PlatformMock }));
vi.mock("@sublay/core", () => ({
  handleError: (...args: unknown[]) => handleError(...args),
}));
vi.mock("@react-native-firebase/messaging", () => ({ default: messagingFn }));

import { reactNativePushTokenAdapter } from "./PushTokenAdapter";

afterEach(() => {
  vi.clearAllMocks();
});

describe("reactNativePushTokenAdapter.canReadIdentifierWithoutPrompting", () => {
  it("is declared, so core reads the identifier on mount instead of awaiting a rotation", () => {
    // Neither `getToken()` nor `getAPNSToken()` prompts — permission was
    // granted before any token existed, which is why the refresh handler
    // already re-derives through `getDeviceIdentifier`. It matters most here:
    // `onTokenRefresh` carries an FCM token, so an APNs rotation on iOS never
    // raises it at all, and an upgrading install would otherwise sit with a
    // live server-side binding it has no local identifier to unbind.
    expect(
      reactNativePushTokenAdapter.canReadIdentifierWithoutPrompting,
    ).toBe(true);
  });
});

describe("reactNativePushTokenAdapter.requestPermission", () => {
  it("returns true when authorized", async () => {
    requestPermission.mockResolvedValue(1); // AUTHORIZED
    await expect(reactNativePushTokenAdapter.requestPermission()).resolves.toBe(true);
  });

  it("returns true when provisionally authorized", async () => {
    requestPermission.mockResolvedValue(2); // PROVISIONAL
    await expect(reactNativePushTokenAdapter.requestPermission()).resolves.toBe(true);
  });

  it("returns false when denied", async () => {
    requestPermission.mockResolvedValue(0); // DENIED
    await expect(reactNativePushTokenAdapter.requestPermission()).resolves.toBe(false);
  });
});

describe("reactNativePushTokenAdapter.getDeviceIdentifier", () => {
  it("returns the raw APNs token on iOS", async () => {
    PlatformMock.OS = "ios";
    getAPNSToken.mockResolvedValue("apns-token-1");

    await expect(
      reactNativePushTokenAdapter.getDeviceIdentifier({ projectId: "project-1" }),
    ).resolves.toEqual({ platform: "ios", token: "apns-token-1" });
    expect(getToken).not.toHaveBeenCalled();
  });

  it("returns null on iOS when no APNs token is available", async () => {
    PlatformMock.OS = "ios";
    getAPNSToken.mockResolvedValue(null);

    await expect(
      reactNativePushTokenAdapter.getDeviceIdentifier({ projectId: "project-1" }),
    ).resolves.toBeNull();
  });

  it("returns the FCM token on Android", async () => {
    PlatformMock.OS = "android";
    getToken.mockResolvedValue("fcm-token-1");

    await expect(
      reactNativePushTokenAdapter.getDeviceIdentifier({ projectId: "project-1" }),
    ).resolves.toEqual({ platform: "android", token: "fcm-token-1" });
    expect(getAPNSToken).not.toHaveBeenCalled();
  });

  it("returns null on Android when no FCM token is available", async () => {
    PlatformMock.OS = "android";
    getToken.mockResolvedValue(null);

    await expect(
      reactNativePushTokenAdapter.getDeviceIdentifier({ projectId: "project-1" }),
    ).resolves.toBeNull();
  });
});

describe("reactNativePushTokenAdapter.subscribeToIdentifierChanges", () => {
  it("RE-DERIVES on iOS instead of trusting the emitted FCM token", async () => {
    PlatformMock.OS = "ios";
    getAPNSToken.mockResolvedValue("apns-token-2");
    const unsubscribe = vi.fn();
    onTokenRefresh.mockReturnValue(unsubscribe);

    let emitted: unknown;
    const returned = reactNativePushTokenAdapter.subscribeToIdentifierChanges!(
      { projectId: "project-1" },
      (identifier) => {
        emitted = identifier;
      },
    );

    const handler = onTokenRefresh.mock.calls[0][0] as (t: string) => void;
    // The event carries an FCM token while the adapter registers APNs — using
    // it verbatim would bind the wrong kind of value entirely.
    handler("fcm-token-that-must-be-ignored");
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(getAPNSToken).toHaveBeenCalled();
    expect(emitted).toEqual({ platform: "ios", token: "apns-token-2" });

    returned();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it("re-derives on android too", async () => {
    PlatformMock.OS = "android";
    getToken.mockResolvedValue("fcm-token-3");
    onTokenRefresh.mockReturnValue(vi.fn());

    let emitted: unknown;
    reactNativePushTokenAdapter.subscribeToIdentifierChanges!(
      { projectId: "project-1" },
      (identifier) => {
        emitted = identifier;
      },
    );

    const handler = onTokenRefresh.mock.calls[0][0] as (t: string) => void;
    handler("ignored");
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(emitted).toEqual({ platform: "android", token: "fcm-token-3" });
  });

  it("REPORTS a failed re-derivation instead of reporting no change", async () => {
    // It used to answer a failure with `onChange(null)`, which is core's "there
    // is nothing to report" signal — so a device whose token had just rotated
    // was told nothing had changed, stayed bound to the replaced token, and
    // left no trace anywhere. Rotation coverage died silently.
    PlatformMock.OS = "android";
    getToken.mockRejectedValue(new Error("no token"));
    onTokenRefresh.mockReturnValue(vi.fn());

    let emitted: unknown = "unset";
    reactNativePushTokenAdapter.subscribeToIdentifierChanges!(
      { projectId: "project-1" },
      (identifier) => {
        emitted = identifier;
      },
    );

    const handler = onTokenRefresh.mock.calls[0][0] as (t: string) => void;
    handler("ignored");
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Nothing emitted at all — not a no-change.
    expect(emitted).toBe("unset");
    expect(handleError).toHaveBeenCalledTimes(1);
    expect(handleError.mock.calls[0][1]).toContain("re-derive");
    // ...and it still does not throw out of the OS callback.
  });
});
