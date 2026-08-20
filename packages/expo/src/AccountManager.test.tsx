import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const getItemAsync = vi.fn();
const setItemAsync = vi.fn();
const deleteItemAsync = vi.fn();
const handleError = vi.fn();

vi.mock("expo-secure-store", () => ({
  getItemAsync: (...args: unknown[]) => getItemAsync(...args),
  setItemAsync: (...args: unknown[]) => setItemAsync(...args),
  deleteItemAsync: (...args: unknown[]) => deleteItemAsync(...args),
}));

vi.mock("@sublay/core", () => ({
  useAccountSync: vi.fn(),
  useProject: vi.fn(),
  handleError: (...args: unknown[]) => handleError(...args),
}));

import { secureStoreStorage } from "./AccountManager";
import type { AccountMap, AccountEntry } from "@sublay/core";

// expo-secure-store rejects keys containing characters outside
// /^[A-Za-z0-9._-]+$/ (notably `:`) on iOS — every key this adapter derives
// must satisfy that constraint, not just the index key.
const SECURE_STORE_KEY_PATTERN = /^[A-Za-z0-9._-]+$/;

const MAX_VALUE_BYTES = 2048;
const PROJECT = "project-1";
const INDEX_KEY = `sublay-accounts_${PROJECT}`;
const accountKey = (userId: string) => `${INDEX_KEY}_u_${userId}`;

/**
 * An in-memory SecureStore.
 *
 * `failAtOp` is the seam the interruption assertions are written against:
 * SecureStore has no key-enumeration API and no transaction, so "an interrupted
 * write leaves the index authoritative" and "an interrupted removal leaves no
 * readable credential" are only assertable if a specific key operation can be
 * made to throw. Every op — read, write and delete — counts.
 */
function installFakeStore(options: { failAtOp?: number } = {}) {
  const store = new Map<string, string>();
  let ops = 0;

  const tick = () => {
    ops += 1;
    if (options.failAtOp !== undefined && ops === options.failAtOp) {
      throw new Error(`SecureStore op #${ops} interrupted`);
    }
  };

  getItemAsync.mockImplementation(async (key: string) => {
    tick();
    return store.has(key) ? store.get(key)! : null;
  });
  setItemAsync.mockImplementation(async (key: string, value: string) => {
    tick();
    store.set(key, value);
  });
  deleteItemAsync.mockImplementation(async (key: string) => {
    tick();
    store.delete(key);
  });

  return {
    store,
    opCount: () => ops,
    /** Reads a key directly, bypassing the failure seam. */
    raw: (key: string) => store.get(key) ?? null,
    keys: () => [...store.keys()],
  };
}

function makeEntry(id: string, overrides: Partial<AccountEntry> = {}): AccountEntry {
  return {
    refreshToken: `refresh-token-for-${id}`,
    tokenExpiresAt: 1893456000000,
    user: {
      id,
      name: `User ${id}`,
      username: `user_${id}`,
      email: `${id}@example.com`,
      avatar: `https://cdn.example.com/${id}.png`,
    },
    ...overrides,
  };
}

/** A JWT-shaped refresh token of realistic length (~430 bytes). */
function realisticToken(id: string): string {
  return `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${"p".repeat(220)}${id}.${"s".repeat(
    172
  )}`;
}

function makeMap(
  ids: string[],
  overrides: Partial<AccountMap> = {},
  entryFor: (id: string) => AccountEntry = makeEntry
): AccountMap {
  const accounts: Record<string, AccountEntry> = {};
  for (const id of ids) accounts[id] = entryFor(id);
  return {
    activeAccountId: ids[0] ?? null,
    accounts,
    signedOut: false,
    ...overrides,
  };
}

function utf8Bytes(value: string): number {
  return Buffer.byteLength(value, "utf8");
}

beforeEach(() => {
  installFakeStore();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("secureStoreStorage — chunked write path", () => {
  it("round-trips a five-account map with no written value over 2048 bytes", async () => {
    const fake = installFakeStore();
    // Realistic entries, not toy ones: a Sublay refresh token is a JWT of a few
    // hundred bytes and avatars are CDN URLs, which is what put a five-account
    // map past the single-value ceiling in the first place.
    const map = makeMap(["a", "b", "c", "d", "e"], {
      activeAccountId: "c",
      deviceIdentifier: {
        platform: "web",
        subscription: {
          endpoint: `https://fcm.googleapis.com/fcm/send/${"x".repeat(152)}`,
          keys: { p256dh: "p".repeat(87), auth: "a".repeat(22) },
        },
      },
    },
    (id) =>
      makeEntry(id, {
        refreshToken: realisticToken(id),
        user: {
          id,
          name: `User ${id}`,
          username: `user_${id}`,
          email: `${id}@example.com`,
          avatar: `https://cdn.example.com/avatars/${"u".repeat(60)}/${id}.png`,
        },
      })
    );

    await secureStoreStorage.setAccountMap(PROJECT, map);

    for (const [key, value] of setItemAsync.mock.calls as [string, string][]) {
      expect(key).toMatch(SECURE_STORE_KEY_PATTERN);
      expect(utf8Bytes(value)).toBeLessThanOrEqual(MAX_VALUE_BYTES);
    }
    // The single-value layout this replaces would have been one value well past
    // the limit — the failure that silently ate whole account maps.
    expect(utf8Bytes(JSON.stringify(map))).toBeGreaterThan(MAX_VALUE_BYTES);

    await expect(secureStoreStorage.getAccountMap(PROJECT)).resolves.toEqual(map);
    expect(fake.keys().length).toBe(6); // index + five accounts
  });

  // The re-auth markers are a persisted-shape change, so the budget has to be
  // re-checked against the LARGEST an entry can now be: every optional field
  // present at once. Both are tiny (a boolean and a number), and neither joins
  // the shed order — `avatar` and `email` are the two unbounded fields and
  // shedding a marker would make the entry load but lie.
  it("still fits five accounts when every optional field is present", async () => {
    installFakeStore();
    const map = makeMap(
      ["a", "b", "c", "d", "e"],
      {
        activeAccountId: "c",
        deviceIdentifier: {
          platform: "web",
          subscription: {
            endpoint: `https://fcm.googleapis.com/fcm/send/${"x".repeat(152)}`,
            keys: { p256dh: "p".repeat(87), auth: "a".repeat(22) },
          },
        },
      },
      (id) =>
        makeEntry(id, {
          refreshToken: realisticToken(id),
          pushEnabled: false,
          needsReauth: true,
          user: {
            id,
            name: `User ${id}`,
            username: `user_${id}`,
            email: `${id}@example.com`,
            avatar: `https://cdn.example.com/avatars/${"u".repeat(60)}/${id}.png`,
          },
        })
    );

    await secureStoreStorage.setAccountMap(PROJECT, map);

    for (const [, value] of setItemAsync.mock.calls as [string, string][]) {
      expect(utf8Bytes(value)).toBeLessThanOrEqual(MAX_VALUE_BYTES);
    }
    // Round-trips verbatim: neither marker is dropped or defaulted on read.
    await expect(secureStoreStorage.getAccountMap(PROJECT)).resolves.toEqual(map);
  });

  it("reads an entry written before the re-auth marker existed", async () => {
    const fake = installFakeStore();
    await secureStoreStorage.setAccountMap(PROJECT, makeMap(["a"]));

    const loaded = await secureStoreStorage.getAccountMap(PROJECT);
    expect(loaded!.accounts["a"].needsReauth).toBeUndefined();
    expect(fake.keys().length).toBe(2);
  });

  it("writes one value per account plus a versioned index", async () => {
    const fake = installFakeStore();
    await secureStoreStorage.setAccountMap(PROJECT, makeMap(["a", "b"]));

    expect(fake.keys().sort()).toEqual(
      [INDEX_KEY, accountKey("a"), accountKey("b")].sort()
    );
    const index = JSON.parse(fake.raw(INDEX_KEY)!);
    expect(index.v).toBe(2);
    expect(index.accountIds.sort()).toEqual(["a", "b"]);
    expect(index.pending).toEqual([]);
  });

  it("carries the signed-out flag and the device identifier in the index", async () => {
    const fake = installFakeStore();
    await secureStoreStorage.setAccountMap(
      PROJECT,
      makeMap(["a"], {
        activeAccountId: null,
        signedOut: true,
        deviceIdentifier: { platform: "ios", token: "apns-token" },
      })
    );

    const index = JSON.parse(fake.raw(INDEX_KEY)!);
    expect(index.signedOut).toBe(true);
    expect(index.deviceIdentifier).toEqual({
      platform: "ios",
      token: "apns-token",
    });

    const loaded = await secureStoreStorage.getAccountMap(PROJECT);
    expect(loaded!.signedOut).toBe(true);
    expect(loaded!.deviceIdentifier).toEqual({
      platform: "ios",
      token: "apns-token",
    });
  });

  it("preserves pushEnabled: false through a round trip", async () => {
    await secureStoreStorage.setAccountMap(PROJECT, {
      activeAccountId: "a",
      accounts: { a: makeEntry("a", { pushEnabled: false }) },
      signedOut: false,
    });

    const loaded = await secureStoreStorage.getAccountMap(PROJECT);
    expect(loaded!.accounts.a.pushEnabled).toBe(false);
  });

  it("sheds avatar, then email, keeping id/name/username and the refresh token", async () => {
    const fake = installFakeStore();
    const oversized = makeEntry("a", {
      user: {
        id: "a",
        name: "Big Avatar",
        username: "big_avatar",
        email: "a@example.com",
        avatar: `https://cdn.example.com/${"x".repeat(2200)}.png`,
      },
    });

    await secureStoreStorage.setAccountMap(PROJECT, {
      activeAccountId: "a",
      accounts: { a: oversized },
      signedOut: false,
    });

    const loaded = await secureStoreStorage.getAccountMap(PROJECT);
    expect(loaded!.accounts.a.user.avatar).toBeNull();
    expect(loaded!.accounts.a.user.email).toBe("a@example.com"); // avatar alone was enough
    expect(loaded!.accounts.a.user.name).toBe("Big Avatar");
    expect(loaded!.accounts.a.user.username).toBe("big_avatar");
    expect(loaded!.accounts.a.refreshToken).toBe("refresh-token-for-a");
    expect(utf8Bytes(fake.raw(accountKey("a"))!)).toBeLessThanOrEqual(
      MAX_VALUE_BYTES
    );
    expect(handleError.mock.calls.some(([, msg]) => msg === "Account entry too large for SecureStore")).toBe(true);
    expect(String(handleError.mock.calls[0][0])).toContain("avatar");
  });

  it("also sheds email when dropping the avatar is not enough", async () => {
    const fake = installFakeStore();
    await secureStoreStorage.setAccountMap(PROJECT, {
      activeAccountId: "a",
      accounts: {
        a: makeEntry("a", {
          user: {
            id: "a",
            name: "Long Email",
            username: "long_email",
            email: `${"e".repeat(2100)}@example.com`,
            avatar: `https://cdn.example.com/${"x".repeat(600)}.png`,
          },
        }),
      },
      signedOut: false,
    });

    const loaded = await secureStoreStorage.getAccountMap(PROJECT);
    expect(loaded!.accounts.a.user.avatar).toBeNull();
    expect(loaded!.accounts.a.user.email).toBeNull();
    expect(loaded!.accounts.a.refreshToken).toBe("refresh-token-for-a");
    expect(utf8Bytes(fake.raw(accountKey("a"))!)).toBeLessThanOrEqual(
      MAX_VALUE_BYTES
    );
    expect(String(handleError.mock.calls[0][0])).toContain("email");
  });

  it("rejects — and logs — when a write fails, instead of resolving successfully", async () => {
    // The contract change the awaited persist depends on. Op 1 is the index
    // read, op 2 the first value write.
    installFakeStore({ failAtOp: 2 });

    await expect(
      secureStoreStorage.setAccountMap(PROJECT, makeMap(["a"]))
    ).rejects.toThrow("interrupted");
    expect(handleError).toHaveBeenCalledWith(
      expect.anything(),
      "Failed to write account map to SecureStore"
    );
  });

  it("leaves the previous index authoritative when a value write is interrupted", async () => {
    const fake = installFakeStore();
    await secureStoreStorage.setAccountMap(PROJECT, makeMap(["a"]));
    const committed = fake.raw(INDEX_KEY);

    // Re-arm the seam on the SAME backing store, then interrupt partway through
    // adding a second account.
    let ops = 0;
    setItemAsync.mockImplementation(async (key: string, value: string) => {
      ops += 1;
      // op 1 = the pending announcement, op 2 = a per-account value.
      if (ops === 2) throw new Error("interrupted");
      fake.store.set(key, value);
    });

    await expect(
      secureStoreStorage.setAccountMap(PROJECT, makeMap(["a", "b"]))
    ).rejects.toThrow("interrupted");

    const index = JSON.parse(fake.raw(INDEX_KEY)!);
    // `accountIds` still names only the committed map…
    expect(index.accountIds).toEqual(["a"]);
    expect(JSON.parse(committed!).accountIds).toEqual(["a"]);
    // …and "b" is announced, so it is reachable for the sweep even though the
    // index does not claim it.
    expect(index.pending).toContain("b");
  });
});

describe("secureStoreStorage — tolerant loader", () => {
  it("returns null when nothing is stored for the project", async () => {
    installFakeStore();
    await expect(secureStoreStorage.getAccountMap(PROJECT)).resolves.toBeNull();
  });

  it("reads a shape that is neither layout as signed-out", async () => {
    // Not a v1 map and not a v2 index — nothing to migrate, so it degrades to
    // signed-out exactly as before.
    const fake = installFakeStore();
    fake.store.set(INDEX_KEY, JSON.stringify({ hello: "world" }));

    await expect(secureStoreStorage.getAccountMap(PROJECT)).resolves.toEqual({
      activeAccountId: null,
      accounts: {},
      signedOut: true,
    });
    // …and nothing was written for it.
    expect(setItemAsync).not.toHaveBeenCalled();
  });

  it("reads corrupt JSON as signed-out rather than throwing", async () => {
    const fake = installFakeStore();
    fake.store.set(INDEX_KEY, "{not json");
    await expect(secureStoreStorage.getAccountMap(PROJECT)).resolves.toEqual({
      activeAccountId: null,
      accounts: {},
      signedOut: true,
    });
  });

  it("tolerates an index entry whose value is missing", async () => {
    const fake = installFakeStore();
    await secureStoreStorage.setAccountMap(PROJECT, makeMap(["a", "b"]));
    fake.store.delete(accountKey("b"));

    const loaded = await secureStoreStorage.getAccountMap(PROJECT);
    expect(Object.keys(loaded!.accounts)).toEqual(["a"]);
  });

  it("returns null when the store itself is unreadable", async () => {
    getItemAsync.mockRejectedValue(new Error("not available"));
    await expect(secureStoreStorage.getAccountMap(PROJECT)).resolves.toBeNull();
  });
});

describe("secureStoreStorage — removal path", () => {
  it("deletes the removed account's value and leaves nothing pending", async () => {
    const fake = installFakeStore();
    await secureStoreStorage.setAccountMap(PROJECT, makeMap(["a", "b"]));
    await secureStoreStorage.setAccountMap(PROJECT, makeMap(["a"]));

    expect(fake.keys().sort()).toEqual([INDEX_KEY, accountKey("a")].sort());
    expect(JSON.parse(fake.raw(INDEX_KEY)!).pending).toEqual([]);
  });

  it("a removal interrupted before its delete leaves NO readable credential — the next load sweeps it", async () => {
    // The acceptance criterion the pending list exists for. A plain
    // previous-minus-current diff cannot find this orphan: the index no longer
    // names "b", so the diff is empty and, with no key-enumeration API, the
    // credential would be unreachable forever.
    const fake = installFakeStore();
    await secureStoreStorage.setAccountMap(PROJECT, makeMap(["a", "b"]));

    // Interrupt at the delete that follows the commit.
    deleteItemAsync.mockImplementation(async () => {
      throw new Error("interrupted");
    });
    await secureStoreStorage.setAccountMap(PROJECT, makeMap(["a"]));

    // The credential is still on disk, but the index announces it…
    expect(fake.raw(accountKey("b"))).not.toBeNull();
    expect(JSON.parse(fake.raw(INDEX_KEY)!).pending).toEqual(["b"]);

    // …so the next load reclaims it.
    deleteItemAsync.mockImplementation(async (key: string) => {
      fake.store.delete(key);
    });
    const loaded = await secureStoreStorage.getAccountMap(PROJECT);

    expect(loaded!.accounts.b).toBeUndefined();
    expect(fake.raw(accountKey("b"))).toBeNull();
    expect(JSON.parse(fake.raw(INDEX_KEY)!).pending).toEqual([]);
    expect(fake.keys().sort()).toEqual([INDEX_KEY, accountKey("a")].sort());
  });

  it("sweeps a value written but never committed", async () => {
    // The add-path mirror of the same hazard: the value landed, the commit did
    // not. Without the announcement it would be an unreachable orphan too.
    const fake = installFakeStore();
    await secureStoreStorage.setAccountMap(PROJECT, makeMap(["a"]));

    let ops = 0;
    setItemAsync.mockImplementation(async (key: string, value: string) => {
      ops += 1;
      // op 1 = announcement, ops 2-3 = the two per-account values,
      // op 4 = the commit.
      if (ops === 4) throw new Error("interrupted");
      fake.store.set(key, value);
    });
    await expect(
      secureStoreStorage.setAccountMap(PROJECT, makeMap(["a", "b"]))
    ).rejects.toThrow("interrupted");
    expect(fake.raw(accountKey("b"))).not.toBeNull();

    setItemAsync.mockImplementation(async (key: string, value: string) => {
      fake.store.set(key, value);
    });
    const loaded = await secureStoreStorage.getAccountMap(PROJECT);

    expect(loaded!.accounts.b).toBeUndefined();
    expect(fake.raw(accountKey("b"))).toBeNull();
  });

  it("deleteAccountMap leaves zero keys behind", async () => {
    const fake = installFakeStore();
    await secureStoreStorage.setAccountMap(
      PROJECT,
      makeMap(["a", "b", "c"], {
        deviceIdentifier: { platform: "ios", token: "apns-token" },
      })
    );
    expect(fake.keys().length).toBe(4);

    await secureStoreStorage.deleteAccountMap(PROJECT);

    // Not just the index — after chunking, deleting one key would have left
    // every per-account refresh token resident and unreachable.
    expect(fake.keys()).toEqual([]);
    await expect(secureStoreStorage.getAccountMap(PROJECT)).resolves.toBeNull();
  });

  it("deleteAccountMap also clears values that were only announced", async () => {
    const fake = installFakeStore();
    await secureStoreStorage.setAccountMap(PROJECT, makeMap(["a", "b"]));
    deleteItemAsync.mockImplementation(async () => {
      throw new Error("interrupted");
    });
    await secureStoreStorage.setAccountMap(PROJECT, makeMap(["a"]));
    deleteItemAsync.mockImplementation(async (key: string) => {
      fake.store.delete(key);
    });

    await secureStoreStorage.deleteAccountMap(PROJECT);
    expect(fake.keys()).toEqual([]);
  });

  it("rejects — and logs — when the wipe cannot complete", async () => {
    const fake = installFakeStore();
    await secureStoreStorage.setAccountMap(PROJECT, makeMap(["a"]));
    deleteItemAsync.mockRejectedValue(new Error("keychain locked"));

    await expect(secureStoreStorage.deleteAccountMap(PROJECT)).rejects.toThrow(
      "keychain locked"
    );
    expect(handleError).toHaveBeenCalledWith(
      expect.anything(),
      "Failed to delete account map from SecureStore"
    );
    // The index survives, so a retry can still find what is left.
    expect(fake.raw(INDEX_KEY)).not.toBeNull();
  });
});

describe("secureStoreStorage — first write", () => {
  it("announces an EMPTY map, so an interruption cannot leave an active id naming an unlisted account", async () => {
    const fake = installFakeStore();

    let ops = 0;
    setItemAsync.mockImplementation(async (key: string, value: string) => {
      ops += 1;
      if (ops === 2) throw new Error("interrupted"); // the first value write
      fake.store.set(key, value);
    });

    await expect(
      secureStoreStorage.setAccountMap(PROJECT, makeMap(["a"]))
    ).rejects.toThrow("interrupted");

    setItemAsync.mockImplementation(async (key: string, value: string) => {
      fake.store.set(key, value);
    });
    const loaded = await secureStoreStorage.getAccountMap(PROJECT);

    expect(loaded).toEqual({
      activeAccountId: null,
      accounts: {},
      signedOut: false,
      deviceIdentifier: null,
    });
  });
});

describe("secureStoreStorage — an unreadable index must not be clobbered", () => {
  it("setAccountMap REJECTS instead of overwriting an index it could not read", async () => {
    // "Threw" is not "nothing stored". Conflating them sent the write down the
    // first-write branch, which computes orphans against an empty committed
    // list — so every account already on disk was neither announced nor swept,
    // and its refresh token became unreachable. The one orphan the pending list
    // cannot reach, because it was never told about it.
    const fake = installFakeStore();
    await secureStoreStorage.setAccountMap(PROJECT, makeMap(["a", "b"]));
    const committedIndex = fake.raw(INDEX_KEY);
    // Drop the setup write's call history without disturbing the fake store's
    // implementations (`clearAllMocks` would strip those too).
    setItemAsync.mockClear();

    getItemAsync.mockRejectedValue(new Error("keychain locked"));

    await expect(
      secureStoreStorage.setAccountMap(PROJECT, makeMap(["c"]))
    ).rejects.toThrow("keychain locked");

    // Nothing was touched: the real index survives and so do both credentials.
    expect(fake.raw(INDEX_KEY)).toBe(committedIndex);
    expect(fake.raw(accountKey("a"))).not.toBeNull();
    expect(fake.raw(accountKey("b"))).not.toBeNull();
    expect(fake.raw(accountKey("c"))).toBeNull();
    expect(setItemAsync).not.toHaveBeenCalled();
    expect(handleError).toHaveBeenCalledWith(
      expect.anything(),
      "Failed to write account map to SecureStore"
    );

    // And once the store answers again, the retry is an ordinary write.
    getItemAsync.mockImplementation(async (key: string) => fake.raw(key));
    await secureStoreStorage.setAccountMap(PROJECT, makeMap(["c"]));
    expect(fake.keys().sort()).toEqual([INDEX_KEY, accountKey("c")].sort());
  });

  it("deleteAccountMap REJECTS rather than deleting an index it could not read", async () => {
    // Deleting the index we could not read would leave every per-account value
    // resident and unreachable — a credential wipe that wipes nothing.
    const fake = installFakeStore();
    await secureStoreStorage.setAccountMap(PROJECT, makeMap(["a", "b"]));
    deleteItemAsync.mockClear();

    getItemAsync.mockRejectedValue(new Error("keychain locked"));

    await expect(secureStoreStorage.deleteAccountMap(PROJECT)).rejects.toThrow(
      "keychain locked"
    );
    expect(deleteItemAsync).not.toHaveBeenCalled();
    expect(fake.keys().length).toBe(3);
    expect(handleError).toHaveBeenCalledWith(
      expect.anything(),
      "Failed to delete account map from SecureStore"
    );
  });

  it("getAccountMap still returns null on an unreadable store — the read path is unchanged", async () => {
    getItemAsync.mockRejectedValue(new Error("keychain locked"));
    await expect(secureStoreStorage.getAccountMap(PROJECT)).resolves.toBeNull();
  });

  it("a genuinely empty store still takes the first-write path", async () => {
    // The distinction only matters for a throw: "nothing stored" must keep
    // working exactly as before.
    const fake = installFakeStore();
    await secureStoreStorage.setAccountMap(PROJECT, makeMap(["a"]));
    expect(fake.keys().sort()).toEqual([INDEX_KEY, accountKey("a")].sort());
  });
});

/**
 * The v1 → v2 shim. Every assertion here is about data written by a release
 * that predates chunking: the whole account map as one JSON value, sitting at
 * the very key the v2 index now uses.
 */
describe("secureStoreStorage — v1 → v2 migration", () => {
  /** An entry exactly as `@sublay/expo` 7.11.1 and earlier wrote it. */
  function v1Entry(id: string, overrides: Record<string, unknown> = {}) {
    return {
      refreshToken: `refresh-token-for-${id}`,
      tokenExpiresAt: 1893456000000,
      user: {
        id,
        name: `User ${id}`,
        email: `${id}@example.com`,
        avatar: `https://cdn.example.com/${id}.png`,
      },
      ...overrides,
    };
  }

  function plantV1(
    fake: ReturnType<typeof installFakeStore>,
    blob: Record<string, unknown>
  ) {
    fake.store.set(INDEX_KEY, JSON.stringify(blob));
  }

  it("keeps the session: a v1 map loads with its accounts and its selection", async () => {
    const fake = installFakeStore();
    plantV1(fake, {
      // The selection is deliberately NOT the first key — "pick the first
      // account" would pass an assertion that only checked for a non-null id.
      activeAccountId: "b",
      accounts: { a: v1Entry("a"), b: v1Entry("b") },
    });

    const loaded = await secureStoreStorage.getAccountMap(PROJECT);

    expect(loaded).toEqual({
      activeAccountId: "b",
      accounts: { a: v1Entry("a"), b: v1Entry("b") },
      signedOut: false,
      deviceIdentifier: null,
    });
    expect(loaded!.accounts.b.refreshToken).toBe("refresh-token-for-b");
  });

  it("leaves the store in ordinary v2 form — one value per account plus an index", async () => {
    const fake = installFakeStore();
    plantV1(fake, {
      activeAccountId: "a",
      accounts: { a: v1Entry("a"), b: v1Entry("b") },
    });

    await secureStoreStorage.getAccountMap(PROJECT);

    expect(fake.keys().sort()).toEqual(
      [INDEX_KEY, accountKey("a"), accountKey("b")].sort()
    );
    const index = JSON.parse(fake.raw(INDEX_KEY)!);
    expect(index.v).toBe(2);
    expect(index.accountIds.sort()).toEqual(["a", "b"]);
    expect(index.pending).toEqual([]);
    expect(index.activeAccountId).toBe("a");
    // The v1 blob is gone: the key holds an index, not a map.
    expect(index.accounts).toBeUndefined();
    for (const [key, value] of setItemAsync.mock.calls as [string, string][]) {
      expect(key).toMatch(SECURE_STORE_KEY_PATTERN);
      expect(utf8Bytes(value)).toBeLessThanOrEqual(MAX_VALUE_BYTES);
    }
  });

  it("takes the ordinary read path on the second load — the migration runs once", async () => {
    const fake = installFakeStore();
    plantV1(fake, {
      activeAccountId: "b",
      accounts: { a: v1Entry("a"), b: v1Entry("b") },
    });

    const first = await secureStoreStorage.getAccountMap(PROJECT);
    setItemAsync.mockClear();
    deleteItemAsync.mockClear();

    const second = await secureStoreStorage.getAccountMap(PROJECT);

    // Byte-identical result, and not one write: the second load is a plain read.
    expect(second).toEqual(first);
    expect(setItemAsync).not.toHaveBeenCalled();
    expect(deleteItemAsync).not.toHaveBeenCalled();
    expect(fake.keys().sort()).toEqual(
      [INDEX_KEY, accountKey("a"), accountKey("b")].sort()
    );
  });

  it("gives the fields v1 never had their absent-field meanings", async () => {
    const fake = installFakeStore();
    plantV1(fake, { activeAccountId: "a", accounts: { a: v1Entry("a") } });

    const loaded = await secureStoreStorage.getAccountMap(PROJECT);
    const entry = loaded!.accounts.a;

    // Absent, not `false`/`null`: absent pushEnabled means enabled, absent
    // needsReauth means no opinion, absent username means unknown. Writing a
    // concrete value for any of them would assert something v1 never recorded.
    expect("pushEnabled" in entry).toBe(false);
    expect("needsReauth" in entry).toBe(false);
    expect("username" in entry.user).toBe(false);
    expect(entry.pushEnabled !== false).toBe(true); // isAccountPushEnabled
    expect(entry.needsReauth === true).toBe(false); // accountNeedsReauth
    // And the stored value carries the same absences forward.
    const stored = JSON.parse(fake.raw(accountKey("a"))!);
    expect("pushEnabled" in stored).toBe(false);
    expect("needsReauth" in stored).toBe(false);
  });

  it("keeps tokenExpiresAt, which predates chunking, and defaults it only when missing", async () => {
    const fake = installFakeStore();
    plantV1(fake, {
      activeAccountId: "a",
      accounts: {
        a: v1Entry("a", { tokenExpiresAt: 1893456000000 }),
        b: v1Entry("b", { tokenExpiresAt: undefined }),
      },
    });

    const loaded = await secureStoreStorage.getAccountMap(PROJECT);
    expect(loaded!.accounts.a.tokenExpiresAt).toBe(1893456000000);
    // Defensive only — every v1 writer emitted the field. `0` reads as expired,
    // which prompts a re-auth rather than claiming a dead credential is live.
    expect(loaded!.accounts.b.tokenExpiresAt).toBe(0);
  });

  it("carries a deliberate signed-out state across the conversion", async () => {
    const fake = installFakeStore();
    plantV1(fake, {
      activeAccountId: null,
      accounts: { a: v1Entry("a") },
      signedOut: true,
    });

    const loaded = await secureStoreStorage.getAccountMap(PROJECT);
    expect(loaded!.signedOut).toBe(true);
    expect(loaded!.activeAccountId).toBeNull();
    expect(JSON.parse(fake.raw(INDEX_KEY)!).signedOut).toBe(true);
  });

  it("reads an absent signedOut as false — most v1 values predate the field", async () => {
    const fake = installFakeStore();
    plantV1(fake, { activeAccountId: "a", accounts: { a: v1Entry("a") } });

    const loaded = await secureStoreStorage.getAccountMap(PROJECT);
    expect(loaded!.signedOut).toBe(false);
  });

  it("converts a v1 map that holds no accounts — there is nothing to lose", async () => {
    // The signed-out-with-nothing-stored state, in v1 form. Recognizable, so it
    // is normalized to a v2 index rather than left for the next load to re-read.
    const fake = installFakeStore();
    plantV1(fake, { activeAccountId: null, accounts: {} });

    const loaded = await secureStoreStorage.getAccountMap(PROJECT);
    expect(loaded).toEqual({
      activeAccountId: null,
      accounts: {},
      signedOut: false,
      deviceIdentifier: null,
    });
    expect(fake.keys()).toEqual([INDEX_KEY]);
    expect(JSON.parse(fake.raw(INDEX_KEY)!)).toMatchObject({
      v: 2,
      accountIds: [],
      pending: [],
    });
  });

  it("does NOT migrate unparseable bytes", async () => {
    const fake = installFakeStore();
    fake.store.set(INDEX_KEY, "{not json");

    await expect(secureStoreStorage.getAccountMap(PROJECT)).resolves.toEqual({
      activeAccountId: null,
      accounts: {},
      signedOut: true,
    });
    expect(setItemAsync).not.toHaveBeenCalled();
    expect(fake.keys()).toEqual([INDEX_KEY]); // no per-account keys invented
  });

  it("does NOT migrate an object whose accounts are not accounts", async () => {
    // Has the right outline and nothing usable inside it: no refresh token, so
    // there is no session to preserve and no entry to write.
    const fake = installFakeStore();
    plantV1(fake, { activeAccountId: "a", accounts: { a: { nickname: "a" } } });

    await expect(secureStoreStorage.getAccountMap(PROJECT)).resolves.toEqual({
      activeAccountId: null,
      accounts: {},
      signedOut: true,
    });
    expect(setItemAsync).not.toHaveBeenCalled();
    expect(fake.keys()).toEqual([INDEX_KEY]);
  });

  it("does NOT migrate a value that is merely JSON", async () => {
    const fake = installFakeStore();
    for (const value of ['"a string"', "42", "[1,2,3]", "null"]) {
      fake.store.set(INDEX_KEY, value);
      await expect(secureStoreStorage.getAccountMap(PROJECT)).resolves.toEqual({
        activeAccountId: null,
        accounts: {},
        signedOut: true,
      });
    }
    expect(setItemAsync).not.toHaveBeenCalled();
  });

  it("migrates the readable accounts and drops an unreadable sibling", async () => {
    const fake = installFakeStore();
    plantV1(fake, {
      activeAccountId: "a",
      accounts: { a: v1Entry("a"), b: { user: { id: "b" } } },
    });

    const loaded = await secureStoreStorage.getAccountMap(PROJECT);
    expect(Object.keys(loaded!.accounts)).toEqual(["a"]);
    // The half-entry gets no key of its own — it would load but be unusable.
    expect(fake.keys().sort()).toEqual([INDEX_KEY, accountKey("a")].sort());
  });

  it("fits: a stored v1 map was one value, so every value it becomes is smaller", async () => {
    const fake = installFakeStore();
    const blob = {
      activeAccountId: "c",
      accounts: {
        a: v1Entry("a", { refreshToken: realisticToken("a") }),
        b: v1Entry("b", { refreshToken: realisticToken("b") }),
        c: v1Entry("c", { refreshToken: realisticToken("c") }),
      },
    };
    // A real v1 map had to fit in a single SecureStore value to have been
    // written at all — that ceiling is the premise the conversion rests on.
    expect(utf8Bytes(JSON.stringify(blob))).toBeLessThanOrEqual(MAX_VALUE_BYTES);
    plantV1(fake, blob);

    await secureStoreStorage.getAccountMap(PROJECT);

    for (const key of fake.keys()) {
      expect(utf8Bytes(fake.raw(key)!)).toBeLessThanOrEqual(MAX_VALUE_BYTES);
    }
    expect(handleError).not.toHaveBeenCalled();
  });

  it("still sheds if a v1 value somehow got past the ceiling", async () => {
    // Not reachable through a normal v1 write, but a lenient platform build
    // could have stored one. The ordinary oversize path must still apply.
    const fake = installFakeStore();
    plantV1(fake, {
      activeAccountId: "a",
      accounts: {
        a: v1Entry("a", {
          user: {
            id: "a",
            name: "Big Avatar",
            email: "a@example.com",
            avatar: `https://cdn.example.com/${"x".repeat(2400)}.png`,
          },
        }),
      },
    });

    const loaded = await secureStoreStorage.getAccountMap(PROJECT);

    expect(utf8Bytes(fake.raw(accountKey("a"))!)).toBeLessThanOrEqual(
      MAX_VALUE_BYTES
    );
    const stored = JSON.parse(fake.raw(accountKey("a"))!);
    expect(stored.user.avatar).toBeNull();
    expect(stored.refreshToken).toBe("refresh-token-for-a");
    expect(loaded!.accounts.a.refreshToken).toBe("refresh-token-for-a");
    expect(
      handleError.mock.calls.some(
        ([, msg]) => msg === "Account entry too large for SecureStore"
      )
    ).toBe(true);
  });

  it("an interrupted conversion keeps the v1 value authoritative and retries on the next load", async () => {
    // Ops: 1 = the index read, 2-3 = the per-account values, 4 = the commit.
    const fake = installFakeStore({ failAtOp: 4 });
    plantV1(fake, {
      activeAccountId: "b",
      accounts: { a: v1Entry("a"), b: v1Entry("b") },
    });

    // The load still hands back a usable session rather than signing the user
    // out over a failed write…
    const loaded = await secureStoreStorage.getAccountMap(PROJECT);
    expect(Object.keys(loaded!.accounts).sort()).toEqual(["a", "b"]);
    expect(handleError).toHaveBeenCalledWith(
      expect.anything(),
      "Failed to migrate stored accounts to the current layout"
    );
    // …and the v1 value is untouched, so nothing is lost.
    expect(JSON.parse(fake.raw(INDEX_KEY)!).accounts.b.refreshToken).toBe(
      "refresh-token-for-b"
    );

    // Next launch: the store answers again and the conversion completes.
    getItemAsync.mockImplementation(async (key: string) => fake.raw(key));
    setItemAsync.mockImplementation(async (key: string, value: string) => {
      fake.store.set(key, value);
    });

    const second = await secureStoreStorage.getAccountMap(PROJECT);
    expect(second!.activeAccountId).toBe("b");
    expect(Object.keys(second!.accounts).sort()).toEqual(["a", "b"]);
    expect(JSON.parse(fake.raw(INDEX_KEY)!).v).toBe(2);
    expect(fake.keys().sort()).toEqual(
      [INDEX_KEY, accountKey("a"), accountKey("b")].sort()
    );
  });

  it("an interrupted conversion strands no credential when the app writes before the retry", async () => {
    // The hazard the pending list exists for, in its v1 form. A conversion that
    // wrote "b"'s value and died before its commit leaves that value on disk
    // with only the v1 blob naming it. If the app then persists a map without
    // "b", the writer must announce it — otherwise the commit names neither,
    // and with no key-enumeration API the refresh token is unreachable forever.
    const fake = installFakeStore({ failAtOp: 4 });
    plantV1(fake, {
      activeAccountId: "a",
      accounts: { a: v1Entry("a"), b: v1Entry("b") },
    });
    await secureStoreStorage.getAccountMap(PROJECT);
    expect(fake.raw(accountKey("b"))).not.toBeNull(); // written, uncommitted

    getItemAsync.mockImplementation(async (key: string) => fake.raw(key));
    setItemAsync.mockImplementation(async (key: string, value: string) => {
      fake.store.set(key, value);
    });
    deleteItemAsync.mockImplementation(async (key: string) => {
      fake.store.delete(key);
    });

    // The user signs out of "b" before the next launch ever happens.
    await secureStoreStorage.setAccountMap(PROJECT, makeMap(["a"]));

    expect(fake.raw(accountKey("b"))).toBeNull();
    expect(fake.keys().sort()).toEqual([INDEX_KEY, accountKey("a")].sort());
    expect(JSON.parse(fake.raw(INDEX_KEY)!).pending).toEqual([]);
  });

  it("deleteAccountMap over a half-converted store leaves zero keys", async () => {
    const fake = installFakeStore({ failAtOp: 4 });
    plantV1(fake, {
      activeAccountId: "a",
      accounts: { a: v1Entry("a"), b: v1Entry("b") },
    });
    await secureStoreStorage.getAccountMap(PROJECT);

    getItemAsync.mockImplementation(async (key: string) => fake.raw(key));
    deleteItemAsync.mockImplementation(async (key: string) => {
      fake.store.delete(key);
    });

    await secureStoreStorage.deleteAccountMap(PROJECT);

    // Not just the v1 blob: the values the interrupted conversion wrote would
    // otherwise stay resident and unreachable — a wipe that wipes nothing.
    expect(fake.keys()).toEqual([]);
  });

  it("does not write through core's storage mutex — a write inside a read would deadlock", async () => {
    // `useAccountSync` calls `getAccountMap` INSIDE `runAccountStorageOp`, which
    // serializes per project. Anything in this file that reached for that mutex
    // (or for `persistAccountMapFor`, which takes it) while the read still held
    // it would wait on itself forever. The adapter therefore writes through
    // `expo-secure-store` directly. The `@sublay/core` mock at the top of this
    // file has exactly three exports, so an import of either function would fail
    // this suite at module load — this assertion states the rule the mock
    // enforces.
    const core = await import("@sublay/core");
    expect(Object.keys(core).sort()).toEqual([
      "handleError",
      "useAccountSync",
      "useProject",
    ]);
  });
});
