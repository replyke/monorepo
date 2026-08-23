import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render } from "@testing-library/react";

const useAccountSync = vi.fn();
const useProject = vi.fn();
const handleError = vi.fn();

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
  useAccountSync: (...args: unknown[]) => useAccountSync(...args),
  useProject: () => useProject(),
  handleError: (...args: unknown[]) => handleError(...args),
}));

import AccountManager, { webAccountStorage } from "./AccountManager";

describe("AccountManager (react-js)", () => {
  beforeEach(() => {
    localStorage.clear();
    useProject.mockReturnValue({ projectId: "test-project" });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("wires useAccountSync with the web storage adapter and the current projectId", () => {
    render(<AccountManager />);

    expect(useAccountSync).toHaveBeenCalledTimes(1);
    const [storageArg, projectIdArg] = useAccountSync.mock.calls[0];
    expect(storageArg).toBe(webAccountStorage);
    expect(projectIdArg).toBe("test-project");
  });

  it("renders nothing", () => {
    const { container } = render(<AccountManager />);
    expect(container.firstChild).toBeNull();
  });
});

describe("webAccountStorage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("returns null when nothing has been stored for the project", async () => {
    await expect(webAccountStorage.getAccountMap("project-1")).resolves.toBeNull();
  });

  it("round-trips a stored account map under a project-scoped key", async () => {
    const map = {
      activeAccountId: "user-1",
      accounts: {
        "user-1": {
          refreshToken: "rt",
          tokenExpiresAt: 0,
          user: { id: "user-1", name: "Alice", email: null, avatar: null },
        },
      },
    };

    await webAccountStorage.setAccountMap("project-1", map);
    expect(localStorage.getItem("sublay-accounts:project-1")).toBe(JSON.stringify(map));
    await expect(webAccountStorage.getAccountMap("project-1")).resolves.toEqual(map);
  });

  it("deletes the stored map for a project", async () => {
    await webAccountStorage.setAccountMap("project-1", { activeAccountId: null, accounts: {} });
    await webAccountStorage.deleteAccountMap("project-1");
    expect(localStorage.getItem("sublay-accounts:project-1")).toBeNull();
  });

  it("returns null instead of throwing when stored JSON is corrupt", async () => {
    localStorage.setItem("sublay-accounts:project-1", "{not json");
    await expect(webAccountStorage.getAccountMap("project-1")).resolves.toBeNull();
  });

  it("logs AND REJECTS when localStorage.setItem throws", async () => {
    // Inverted deliberately — see the interface docblock: a write contract that
    // resolves on failure makes every awaited persist a lie.
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });

    await expect(
      webAccountStorage.setAccountMap("project-1", { activeAccountId: null, accounts: {} })
    ).rejects.toThrow("quota exceeded");

    expect(handleError).toHaveBeenCalledTimes(1);
    expect(handleError.mock.calls[0][1]).toBe("Failed to write account map to localStorage");

    setItemSpy.mockRestore();
  });

  it("logs AND REJECTS when localStorage.removeItem throws", async () => {
    const removeItemSpy = vi
      .spyOn(Storage.prototype, "removeItem")
      .mockImplementation(() => {
        throw new Error("storage disabled");
      });

    await expect(
      webAccountStorage.deleteAccountMap("project-1")
    ).rejects.toThrow("storage disabled");

    expect(handleError).toHaveBeenCalledTimes(1);
    expect(handleError.mock.calls[0][1]).toBe(
      "Failed to delete account map from localStorage"
    );

    removeItemSpy.mockRestore();
  });
});

describe("webAccountStorage — malformed persisted values", () => {
  // `localStorage` is not a store this adapter owns. Any script on the origin
  // can write this key, and a value the SDK itself wrote can be truncated by a
  // quota failure mid-write. These are the cases `JSON.parse(raw) as AccountMap`
  // accepted silently, and the crash they cause lands nowhere near this read.

  const KEY = "sublay-accounts:project-1";
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
    localStorage.setItem(KEY, JSON.stringify(value));

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("reads a root that is not an account map as nothing stored", async () => {
    for (const value of [42, "map", true, null, [], { accounts: 42 }, {}]) {
      store(value);
      await expect(
        webAccountStorage.getAccountMap("project-1")
      ).resolves.toBeNull();
    }
  });

  it("reads a non-string activeAccountId as nothing selected", async () => {
    for (const activeAccountId of [42, true, { id: "user-1" }, ["user-1"]]) {
      store({ activeAccountId, accounts: { "user-1": entry } });
      const loaded = await webAccountStorage.getAccountMap("project-1");
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
    const loaded = await webAccountStorage.getAccountMap("project-1");
    expect(loaded!.signedOut).toBe(false);
  });

  it("reads a truthy non-boolean pushIdentifierProbed as still armed", async () => {
    store({ activeAccountId: null, accounts: {}, pushIdentifierProbed: "true" });
    const loaded = await webAccountStorage.getAccountMap("project-1");
    expect(loaded!.pushIdentifierProbed).toBe(false);
  });

  it("reads a HALF-FORMED web subscription as no identifier", async () => {
    // This is the one that throws far from the read: `pushIdentifiersEqual`
    // dereferences `subscription.keys.p256dh` on the STORED identifier with no
    // optional chaining, so an endpoint without keys takes push reconciliation
    // down on every platform.
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
      { platform: "windows", token: "t" },
      "apns-token",
    ];

    for (const deviceIdentifier of malformed) {
      store({ activeAccountId: null, accounts: {}, deviceIdentifier });
      const loaded = await webAccountStorage.getAccountMap("project-1");
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
      const loaded = await webAccountStorage.getAccountMap("project-1");
      expect(loaded!.deviceIdentifier).toEqual(deviceIdentifier);
    }
  });

  it("REJECTS an entry whose user.id disagrees with the key it was filed under", async () => {
    // Not repaired: either half could be the truth, and guessing wrong files a
    // live session under the wrong account.
    store({
      activeAccountId: "user-1",
      accounts: { "user-2": entry },
    });
    const loaded = await webAccountStorage.getAccountMap("project-1");
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
    const loaded = await webAccountStorage.getAccountMap("project-1");
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
    const loaded = await webAccountStorage.getAccountMap("project-1");
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
    await expect(
      webAccountStorage.getAccountMap("project-1")
    ).resolves.toEqual(map);
  });
});
