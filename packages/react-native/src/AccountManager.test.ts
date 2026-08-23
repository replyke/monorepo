import { describe, it, expect, vi, afterEach } from "vitest";

const getGenericPassword = vi.fn();
const setGenericPassword = vi.fn();
const resetGenericPassword = vi.fn();
const handleError = vi.fn();

vi.mock("react-native-keychain", () => ({
  getGenericPassword: (...args: unknown[]) => getGenericPassword(...args),
  setGenericPassword: (...args: unknown[]) => setGenericPassword(...args),
  resetGenericPassword: (...args: unknown[]) => resetGenericPassword(...args),
}));

// The persisted-value validators the adapter imports from `@sublay/core` are
// REAL here, not stubs: they are the behaviour under test below. They are
// pulled in through `vi.importActual` on core's source path rather than an
// ordinary import so that TypeScript never resolves the specifier — each
// package compiles with `rootDir: ./src`, and a static cross-package import
// would fail the build with TS6059. The module is type-only in its own
// imports, so nothing of core's runtime comes with it.
vi.mock("@sublay/core", async () => ({
  ...(await vi.importActual<Record<string, unknown>>(
    "../../core/src/config/storedAccountMap"
  )),
  useAccountSync: vi.fn(),
  useProject: vi.fn(),
  handleError: (...args: unknown[]) => handleError(...args),
}));

import { keychainStorage } from "./AccountManager";

afterEach(() => {
  vi.clearAllMocks();
});

describe("keychainStorage.getAccountMap", () => {
  it("parses and returns the stored account map", async () => {
    const map = { activeAccountId: "user-1", accounts: {} };
    getGenericPassword.mockResolvedValue({ password: JSON.stringify(map) });

    await expect(keychainStorage.getAccountMap("project-1")).resolves.toEqual(map);
    expect(getGenericPassword).toHaveBeenCalledWith({
      service: "sublay-accounts:project-1",
    });
  });

  it("returns null when there are no stored credentials", async () => {
    getGenericPassword.mockResolvedValue(false);
    await expect(keychainStorage.getAccountMap("project-1")).resolves.toBeNull();
  });

  it("swallows errors and returns null when the Keychain read rejects", async () => {
    getGenericPassword.mockRejectedValue(new Error("keychain unavailable"));
    await expect(keychainStorage.getAccountMap("project-1")).resolves.toBeNull();
  });
});

describe("keychainStorage.setAccountMap", () => {
  it("writes the JSON-serialized map under a project-scoped service", async () => {
    setGenericPassword.mockResolvedValue(true);
    const map = { activeAccountId: "user-1", accounts: {} };

    await keychainStorage.setAccountMap("project-1", map);

    expect(setGenericPassword).toHaveBeenCalledWith(
      "sublay-accounts:project-1",
      JSON.stringify(map),
      { service: "sublay-accounts:project-1" },
    );
  });

  it("logs AND REJECTS when the write fails", async () => {
    // Inverted deliberately. This used to resolve void, which made
    // `await storage.setAccountMap(...)` succeed on a failed write — and any
    // guarantee built on that await (most dangerously "the rotated refresh
    // token is durably stored") fictional.
    setGenericPassword.mockRejectedValue(new Error("disk full"));

    await expect(
      keychainStorage.setAccountMap("project-1", { activeAccountId: null, accounts: {} })
    ).rejects.toThrow("disk full");

    expect(handleError).toHaveBeenCalledTimes(1);
    expect(handleError.mock.calls[0][1]).toBe("Failed to write account map to Keychain");
  });
});

describe("keychainStorage.deleteAccountMap", () => {
  it("resets the generic password for the project-scoped service", async () => {
    resetGenericPassword.mockResolvedValue(true);

    await keychainStorage.deleteAccountMap("project-1");

    expect(resetGenericPassword).toHaveBeenCalledWith({
      service: "sublay-accounts:project-1",
    });
  });

  it("logs AND REJECTS when the reset fails", async () => {
    resetGenericPassword.mockRejectedValue(new Error("not found"));

    await expect(keychainStorage.deleteAccountMap("project-1")).rejects.toThrow(
      "not found"
    );

    expect(handleError).toHaveBeenCalledTimes(1);
    expect(handleError.mock.calls[0][1]).toBe("Failed to delete account map from Keychain");
  });
});

describe("keychainStorage.getAccountMap — malformed persisted values", () => {
  // The Keychain is not a store this adapter owns: the item survives an app
  // reinstall, is restorable from a device backup written by an older release,
  // and on Android is shared with anything holding the app's keystore alias.
  // These are the cases `JSON.parse(credentials.password) as AccountMap`
  // accepted silently, and the crash they cause lands nowhere near this read.

  const entry = {
    refreshToken: "rt",
    tokenExpiresAt: 1893456000000,
    user: {
      id: "user-1",
      name: "Alice",
      email: "alice@example.com",
      avatar: "https://cdn.example/a.png",
    },
  };

  const store = (value: unknown) =>
    getGenericPassword.mockResolvedValue({ password: JSON.stringify(value) });

  it("reads a root that is not an account map as nothing stored", async () => {
    for (const value of [42, "map", true, null, [], { accounts: 42 }, {}]) {
      store(value);
      await expect(
        keychainStorage.getAccountMap("project-1")
      ).resolves.toBeNull();
    }
  });

  it("reads a non-string activeAccountId as nothing selected", async () => {
    for (const activeAccountId of [42, true, { id: "user-1" }, ["user-1"]]) {
      store({ activeAccountId, accounts: { "user-1": entry } });
      const loaded = await keychainStorage.getAccountMap("project-1");
      // `AccountMap.activeAccountId` is `string | null`, and core compares it
      // against account keys. Only the pointer was bad — the accounts stay.
      expect(loaded!.activeAccountId).toBeNull();
      expect(Object.keys(loaded!.accounts)).toEqual(["user-1"]);
    }
  });

  it("reads a truthy non-boolean signedOut as NOT signed out", async () => {
    // `"false"` is a truthy string, and this flag suppresses account
    // restoration outright — accepting it leaves the user staring at a
    // signed-out app with their credentials sitting on disk.
    store({ activeAccountId: null, accounts: {}, signedOut: "false" });
    const loaded = await keychainStorage.getAccountMap("project-1");
    expect(loaded!.signedOut).toBe(false);
  });

  it("reads a truthy non-boolean pushIdentifierProbed as still armed", async () => {
    store({ activeAccountId: null, accounts: {}, pushIdentifierProbed: "true" });
    const loaded = await keychainStorage.getAccountMap("project-1");
    expect(loaded!.pushIdentifierProbed).toBe(false);
  });

  it("reads a HALF-FORMED web subscription as no identifier", async () => {
    // A React Native app can hold a `web` identifier: the field is written by
    // whichever platform stored the map, and this store is restorable from a
    // backup. `pushIdentifiersEqual` dereferences `subscription.keys.p256dh` on
    // the STORED identifier with no optional chaining, so an endpoint without
    // keys takes push reconciliation down here too.
    const malformed: unknown[] = [
      { platform: "web", subscription: { endpoint: "https://push.example/x" } },
      {
        platform: "web",
        subscription: {
          endpoint: "https://push.example/x",
          keys: { p256dh: "p" },
        },
      },
      { platform: "web", subscription: null },
      { platform: "ios", token: "" },
      { platform: "android", token: null },
      { platform: "windows", token: "t" },
      "apns-token",
    ];

    for (const deviceIdentifier of malformed) {
      store({ activeAccountId: null, accounts: {}, deviceIdentifier });
      const loaded = await keychainStorage.getAccountMap("project-1");
      expect(loaded!.deviceIdentifier).toBeNull();
    }
  });

  it("keeps a well-formed identifier of either shape", async () => {
    const valid = [
      { platform: "ios", token: "apns-token" },
      {
        platform: "web",
        subscription: {
          endpoint: "https://push.example/x",
          keys: { p256dh: "p256dh-key", auth: "auth-key" },
        },
      },
    ];

    for (const deviceIdentifier of valid) {
      store({ activeAccountId: null, accounts: {}, deviceIdentifier });
      const loaded = await keychainStorage.getAccountMap("project-1");
      expect(loaded!.deviceIdentifier).toEqual(deviceIdentifier);
    }
  });

  it("REJECTS an entry whose user.id disagrees with the key it was filed under", async () => {
    // Not repaired: either half could be the truth, and guessing wrong files a
    // live session under the wrong account.
    store({ activeAccountId: "user-1", accounts: { "user-2": entry } });
    const loaded = await keychainStorage.getAccountMap("project-1");
    expect(loaded!.accounts).toEqual({});
  });

  it("drops only the bad entry — its well-formed siblings survive", async () => {
    store({
      activeAccountId: "user-1",
      accounts: {
        "user-1": entry,
        "user-2": { refreshToken: "", user: { id: "user-2" } },
        "user-3": "not-an-entry",
      },
    });
    const loaded = await keychainStorage.getAccountMap("project-1");
    expect(Object.keys(loaded!.accounts)).toEqual(["user-1"]);
  });

  it("normalizes non-string display fields rather than dropping the entry", async () => {
    // These reach a render — an object where a string belongs takes the account
    // switcher down with "Objects are not valid as a React child".
    store({
      activeAccountId: "user-1",
      accounts: {
        "user-1": {
          refreshToken: "rt",
          tokenExpiresAt: "soon",
          user: { id: "user-1", name: { first: "Alice" }, email: 42, avatar: [] },
        },
      },
    });
    const loaded = await keychainStorage.getAccountMap("project-1");
    expect(loaded!.accounts["user-1"]).toEqual({
      refreshToken: "rt",
      // Not a number, so it reads as expired — the safe direction to be wrong
      // in, since the alternative is claiming a dead credential is live.
      tokenExpiresAt: 0,
      user: { id: "user-1", name: null, email: null, avatar: null },
    });
  });

  it("leaves an ABSENT optional field absent rather than inventing a value", async () => {
    // A map written before `signedOut`/`deviceIdentifier`/`pushIdentifierProbed`
    // existed must come back missing them. Each is documented to read a
    // particular way when absent, and writing a value here would assert
    // something no writer ever chose.
    const map = { activeAccountId: "user-1", accounts: { "user-1": entry } };
    store(map);
    await expect(keychainStorage.getAccountMap("project-1")).resolves.toEqual(map);
  });
});
