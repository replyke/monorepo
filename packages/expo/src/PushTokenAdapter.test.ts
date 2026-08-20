import { describe, it, expect, vi, afterEach } from "vitest";

const requestPermissionsAsync = vi.fn();
const getDevicePushTokenAsync = vi.fn();
const addPushTokenListener = vi.fn();

vi.mock("expo-notifications", () => ({
  requestPermissionsAsync: (...args: unknown[]) => requestPermissionsAsync(...args),
  getDevicePushTokenAsync: (...args: unknown[]) => getDevicePushTokenAsync(...args),
  addPushTokenListener: (...args: unknown[]) => addPushTokenListener(...args),
}));

import { expoPushTokenAdapter } from "./PushTokenAdapter";

afterEach(() => {
  vi.clearAllMocks();
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
