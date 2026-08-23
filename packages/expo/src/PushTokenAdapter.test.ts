import { describe, it, expect, vi, afterEach } from "vitest";

const requestPermissionsAsync = vi.fn();
const getPermissionsAsync = vi.fn();
const getDevicePushTokenAsync = vi.fn();
const addPushTokenListener = vi.fn();

vi.mock("expo-notifications", () => ({
  requestPermissionsAsync: (...args: unknown[]) => requestPermissionsAsync(...args),
  getPermissionsAsync: (...args: unknown[]) => getPermissionsAsync(...args),
  getDevicePushTokenAsync: (...args: unknown[]) => getDevicePushTokenAsync(...args),
  addPushTokenListener: (...args: unknown[]) => addPushTokenListener(...args),
}));

import { expoPushTokenAdapter } from "./PushTokenAdapter";

afterEach(() => {
  vi.clearAllMocks();
});

describe("expoPushTokenAdapter.canReadIdentifierWithoutPrompting", () => {
  it("is declared, so core reads the identifier on mount instead of awaiting a rotation", () => {
    // `addPushTokenListener` is ROTATION-ONLY: it fires when the OS hands over a
    // NEW token, never merely because something subscribed. An install that
    // registered before this SDK persisted device identifiers therefore has a
    // live server-side binding, nothing stored locally, and no event coming —
    // and every unbind path (sign-out, account removal, the per-account toggle)
    // is gated on having one, so all three silently no-op for as long as the
    // token does not rotate. Declaring this is what closes that.
    expect(expoPushTokenAdapter.canReadIdentifierWithoutPrompting).toBe(true);
  });

  it("is only honest because getDevicePushTokenAsync does not prompt", async () => {
    // The declaration is a promise that core may call `getDeviceIdentifier`
    // with no user gesture. Asking for permission is `requestPermissionsAsync`,
    // which lives behind `requestPermission()` and must not be reached here.
    getDevicePushTokenAsync.mockResolvedValue({ type: "ios", data: "apns-1" });

    await expoPushTokenAdapter.getDeviceIdentifier({ projectId: "p1" });

    expect(requestPermissionsAsync).not.toHaveBeenCalled();
  });
});

describe("expoPushTokenAdapter.requestPermission", () => {
  it("returns true when permission is granted", async () => {
    requestPermissionsAsync.mockResolvedValue({ status: "granted" });
    await expect(expoPushTokenAdapter.requestPermission()).resolves.toBe(true);
  });

  it("returns false when permission is denied", async () => {
    requestPermissionsAsync.mockResolvedValue({ status: "denied" });
    await expect(expoPushTokenAdapter.requestPermission()).resolves.toBe(false);
  });
});

/**
 * `hasPermission` is the gate core puts in front of its mount-time identifier
 * read: without a grant there is no binding this release could have created, so
 * nothing is read and nothing is stored. It is therefore load-bearing for
 * consent — a wrong answer here stores a device push token for a user who was
 * never asked — and it must never be the thing that does the asking.
 */
describe("expoPushTokenAdapter.hasPermission", () => {
  it("returns true only for a granted status", async () => {
    getPermissionsAsync.mockResolvedValue({ status: "granted" });
    await expect(expoPushTokenAdapter.hasPermission!()).resolves.toBe(true);
  });

  it("returns false when permission was denied", async () => {
    getPermissionsAsync.mockResolvedValue({ status: "denied" });
    await expect(expoPushTokenAdapter.hasPermission!()).resolves.toBe(false);
  });

  it("returns false when the user has not been asked yet", async () => {
    // `undetermined` is the brand-new install. It must read as "no grant":
    // treating it as permitted is exactly how a device token gets stored for a
    // user who never saw a prompt.
    getPermissionsAsync.mockResolvedValue({ status: "undetermined" });
    await expect(expoPushTokenAdapter.hasPermission!()).resolves.toBe(false);
  });

  it("READS the status and never prompts", async () => {
    // The whole point of a separate method: `requestPermissionsAsync` is the
    // only call that may show the user anything, and it lives behind
    // `requestPermission()`. Core calls this one on mount, with no user
    // gesture, so a prompt here would be an unprompted system dialog.
    getPermissionsAsync.mockResolvedValue({ status: "granted" });

    await expoPushTokenAdapter.hasPermission!();

    expect(getPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(requestPermissionsAsync).not.toHaveBeenCalled();
    expect(getDevicePushTokenAsync).not.toHaveBeenCalled();
  });

  it("is declared, so core has a gate to close", async () => {
    // An adapter that omits it is not gated AT ALL — core reads the identifier
    // unconditionally. Declaring it is what opts this adapter into the
    // permission check.
    expect(typeof expoPushTokenAdapter.hasPermission).toBe("function");
  });
});

describe("expoPushTokenAdapter.getDeviceIdentifier", () => {
  it("returns an ios identifier from the raw device push token", async () => {
    getDevicePushTokenAsync.mockResolvedValue({ type: "ios", data: "apns-token-1" });

    await expect(
      expoPushTokenAdapter.getDeviceIdentifier({ projectId: "project-1" }),
    ).resolves.toEqual({ platform: "ios", token: "apns-token-1" });
  });

  it("returns an android identifier from the raw device push token", async () => {
    getDevicePushTokenAsync.mockResolvedValue({ type: "android", data: "fcm-token-1" });

    await expect(
      expoPushTokenAdapter.getDeviceIdentifier({ projectId: "project-1" }),
    ).resolves.toEqual({ platform: "android", token: "fcm-token-1" });
  });

  it("returns null for an unrecognized token type", async () => {
    getDevicePushTokenAsync.mockResolvedValue({ type: "web", data: {} });

    await expect(
      expoPushTokenAdapter.getDeviceIdentifier({ projectId: "project-1" }),
    ).resolves.toBeNull();
  });
});

describe("expoPushTokenAdapter.subscribeToIdentifierChanges", () => {
  it("maps the emitted DevicePushToken straight through — Expo is the clean case", () => {
    let emitted: unknown;
    const remove = vi.fn();
    addPushTokenListener.mockImplementation(() => ({ remove }));

    const unsubscribe = expoPushTokenAdapter.subscribeToIdentifierChanges!(
      { projectId: "project-1" },
      (identifier) => {
        emitted = identifier;
      },
    );

    const handler = addPushTokenListener.mock.calls[0][0] as (t: unknown) => void;
    handler({ type: "android", data: "fcm-token-2" });
    expect(emitted).toEqual({ platform: "android", token: "fcm-token-2" });

    handler({ type: "web", data: {} });
    expect(emitted).toBeNull();

    unsubscribe();
    expect(remove).toHaveBeenCalled();
  });

  it("does not ask the user for anything", () => {
    addPushTokenListener.mockImplementation(() => ({ remove: vi.fn() }));
    expoPushTokenAdapter.subscribeToIdentifierChanges!(
      { projectId: "project-1" },
      () => {},
    );
    expect(requestPermissionsAsync).not.toHaveBeenCalled();
    expect(getDevicePushTokenAsync).not.toHaveBeenCalled();
  });
});
