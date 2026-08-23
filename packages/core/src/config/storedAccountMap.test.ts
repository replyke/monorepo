import { describe, it, expect } from "vitest";
import {
  readStoredAccountEntry,
  readStoredDeviceIdentifier,
  readStoredMapFields,
  readStoredAccountMap,
} from "./storedAccountMap";

// These are the rules the three `AccountStorage` adapters read their stores
// through. Everything below is JSON that a previous release, a partial write,
// a restored device backup or a tampering user could plausibly have left
// behind — the cases a `JSON.parse(...) as AccountMap` accepts silently.

const wellFormedEntry = {
  refreshToken: "rt",
  tokenExpiresAt: 1893456000000,
  user: {
    id: "user-1",
    name: "Alice",
    username: "alice",
    email: "alice@example.com",
    avatar: "https://cdn.example/a.png",
  },
};

describe("readStoredAccountEntry", () => {
  it("returns a well-formed entry unchanged", () => {
    expect(readStoredAccountEntry("user-1", wellFormedEntry)).toEqual(
      wellFormedEntry
    );
  });

  it("carries through fields it does not name, so a later field survives", () => {
    const entry = { ...wellFormedEntry, pushEnabled: false, needsReauth: true };
    expect(readStoredAccountEntry("user-1", entry)).toEqual(entry);
  });

  it("rejects anything that is not an object", () => {
    for (const value of [null, undefined, 42, "rt", true, ["rt"]]) {
      expect(readStoredAccountEntry("user-1", value)).toBeNull();
    }
  });

  it("rejects an entry with no usable refresh token — there is no session to preserve", () => {
    for (const refreshToken of [undefined, null, "", 42, { token: "rt" }]) {
      expect(
        readStoredAccountEntry("user-1", { ...wellFormedEntry, refreshToken })
      ).toBeNull();
    }
  });

  it("rejects an entry with no user object — there is nobody to preserve it for", () => {
    for (const user of [undefined, null, "user-1", 42, []]) {
      expect(
        readStoredAccountEntry("user-1", { ...wellFormedEntry, user })
      ).toBeNull();
    }
  });

  it("REJECTS rather than repairs an id that disagrees with its key", () => {
    // Either half could be the truth. Repairing is a guess about whose
    // credential this is, and guessing wrong files a live session under the
    // wrong account — the exact failure multi-account storage exists to prevent.
    const conflicting = {
      ...wellFormedEntry,
      user: { ...wellFormedEntry.user, id: "user-2" },
    };
    expect(readStoredAccountEntry("user-1", conflicting)).toBeNull();
  });

  it("treats a non-string id as a conflict too", () => {
    for (const id of [42, true, { id: "user-1" }, null]) {
      expect(
        readStoredAccountEntry("user-1", {
          ...wellFormedEntry,
          user: { ...wellFormedEntry.user, id },
        })
      ).toBeNull();
    }
  });

  it("fills an ABSENT id from the key — every layout keys accounts by user.id", () => {
    const { id: _dropped, ...user } = wellFormedEntry.user;
    const entry = readStoredAccountEntry("user-1", {
      ...wellFormedEntry,
      user,
    });
    expect(entry!.user.id).toBe("user-1");
  });

  it("defaults a non-numeric tokenExpiresAt to 0, which reads as expired", () => {
    for (const tokenExpiresAt of [undefined, null, "soon", {}, []]) {
      const entry = readStoredAccountEntry("user-1", {
        ...wellFormedEntry,
        tokenExpiresAt,
      });
      expect(entry!.tokenExpiresAt).toBe(0);
    }
  });

  it("normalizes non-string display fields to null rather than dropping the entry", () => {
    // These reach a render. An object where a string belongs takes the account
    // switcher down with "Objects are not valid as a React child".
    const entry = readStoredAccountEntry("user-1", {
      ...wellFormedEntry,
      user: {
        id: "user-1",
        name: { first: "Alice" },
        email: 42,
        avatar: ["https://cdn.example/a.png"],
      },
    });
    expect(entry!.user).toEqual({
      id: "user-1",
      name: null,
      email: null,
      avatar: null,
    });
  });
});

describe("readStoredDeviceIdentifier", () => {
  it("keeps a well-formed identifier of either shape", () => {
    const native = { platform: "ios", token: "apns-token" };
    const web = {
      platform: "web",
      subscription: {
        endpoint: "https://push.example/x",
        keys: { p256dh: "p256dh-key", auth: "auth-key" },
      },
    };
    expect(readStoredDeviceIdentifier(native)).toEqual(native);
    expect(readStoredDeviceIdentifier(web)).toEqual(web);
  });

  it("rejects a HALF-FORMED web subscription — the one that throws far from here", () => {
    // `pushIdentifiersEqual` dereferences `subscription.keys.p256dh` on the
    // STORED identifier with no optional chaining. Each of these satisfies a
    // cast and then throws there, on whichever platform loaded the value.
    const halfFormed: unknown[] = [
      { platform: "web", subscription: { endpoint: "https://push.example/x" } },
      {
        platform: "web",
        subscription: {
          endpoint: "https://push.example/x",
          keys: { p256dh: "p" },
        },
      },
      {
        platform: "web",
        subscription: { endpoint: "https://push.example/x", keys: { auth: "a" } },
      },
      {
        platform: "web",
        subscription: { endpoint: "https://push.example/x", keys: "p256dh=p" },
      },
      { platform: "web", subscription: { keys: { p256dh: "p", auth: "a" } } },
      { platform: "web", subscription: null },
      { platform: "web" },
    ];
    for (const value of halfFormed) {
      expect(readStoredDeviceIdentifier(value)).toBeNull();
    }
  });

  it("rejects a native identifier with no usable token", () => {
    for (const value of [
      { platform: "ios" },
      { platform: "ios", token: 12 },
      { platform: "ios", token: "" },
      { platform: "android", token: null },
    ]) {
      expect(readStoredDeviceIdentifier(value)).toBeNull();
    }
  });

  it("rejects an EMPTY endpoint or key — an identifier that routes nowhere is worse than none", () => {
    // `null` leaves the re-acquisition paths free to fetch a real one; a
    // present-but-useless value looks to all of them like one already in hand.
    for (const subscription of [
      { endpoint: "", keys: { p256dh: "p", auth: "a" } },
      { endpoint: "https://push.example/x", keys: { p256dh: "", auth: "a" } },
      { endpoint: "https://push.example/x", keys: { p256dh: "p", auth: "" } },
    ]) {
      expect(
        readStoredDeviceIdentifier({ platform: "web", subscription })
      ).toBeNull();
    }
  });

  it("rejects a value that is neither shape", () => {
    for (const value of [
      null,
      undefined,
      42,
      "apns-token",
      [],
      { platform: "windows", token: "t" },
      {},
    ]) {
      expect(readStoredDeviceIdentifier(value)).toBeNull();
    }
  });
});

describe("readStoredMapFields", () => {
  it("narrows each field to its own type", () => {
    expect(
      readStoredMapFields({
        activeAccountId: "user-1",
        signedOut: true,
        deviceIdentifier: { platform: "ios", token: "apns-token" },
        pushIdentifierProbed: true,
      })
    ).toEqual({
      activeAccountId: "user-1",
      signedOut: true,
      deviceIdentifier: { platform: "ios", token: "apns-token" },
      pushIdentifierProbed: true,
    });
  });

  it("falls back to the safe default for every field the bytes did not supply", () => {
    expect(readStoredMapFields({})).toEqual({
      activeAccountId: null,
      signedOut: false,
      deviceIdentifier: null,
      pushIdentifierProbed: false,
    });
  });

  it("reads a non-string activeAccountId as nothing selected", () => {
    for (const activeAccountId of [42, true, { id: "a" }, ["a"], null]) {
      expect(readStoredMapFields({ activeAccountId }).activeAccountId).toBeNull();
    }
  });

  it("reads a truthy non-boolean signedOut as NOT signed out", () => {
    // The trap `?? false` walks into: `"false"` is a truthy string, and this
    // flag suppresses account restoration outright.
    for (const signedOut of ["false", "true", 1, {}]) {
      expect(readStoredMapFields({ signedOut }).signedOut).toBe(false);
    }
  });

  it("reads a truthy non-boolean pushIdentifierProbed as still armed", () => {
    // Reading it as spent skips the probe, which is the one outcome the flag
    // exists to prevent.
    for (const pushIdentifierProbed of ["false", "true", 1, {}]) {
      expect(
        readStoredMapFields({ pushIdentifierProbed }).pushIdentifierProbed
      ).toBe(false);
    }
  });
});

describe("readStoredAccountMap", () => {
  it("round-trips a well-formed map", () => {
    const map = {
      activeAccountId: "user-1",
      accounts: { "user-1": wellFormedEntry },
      signedOut: false,
      deviceIdentifier: { platform: "ios", token: "apns-token" },
      pushIdentifierProbed: true,
    };
    expect(readStoredAccountMap(map)).toEqual(map);
  });

  it("rejects a root that is not an object", () => {
    for (const value of [null, undefined, 42, "map", true, [], "{}"]) {
      expect(readStoredAccountMap(value)).toBeNull();
    }
  });

  it("rejects a root with no accounts object — that is not an account map", () => {
    for (const accounts of [undefined, null, 42, "accounts", []]) {
      expect(
        readStoredAccountMap({ activeAccountId: null, accounts })
      ).toBeNull();
    }
  });

  it("drops ONLY the malformed entry — its well-formed siblings survive", () => {
    const map = readStoredAccountMap({
      activeAccountId: "user-1",
      accounts: {
        "user-1": wellFormedEntry,
        // Filed under the wrong key.
        "user-2": { ...wellFormedEntry, user: { ...wellFormedEntry.user } },
        // No refresh token.
        "user-3": { user: { id: "user-3", name: null, email: null, avatar: null } },
      },
    });
    expect(Object.keys(map!.accounts)).toEqual(["user-1"]);
  });

  it("returns an empty map, not null, when every entry is malformed", () => {
    // The map itself is recognizable; it just holds nothing usable. `null`
    // would mean "no map at all", which core reads as a device that has never
    // stored an account.
    const map = readStoredAccountMap({
      activeAccountId: "user-1",
      accounts: { "user-1": { refreshToken: 42 } },
      signedOut: false,
    });
    expect(map).toEqual({
      activeAccountId: "user-1",
      accounts: {},
      signedOut: false,
    });
  });

  it("keeps the active pointer verbatim even when its account was dropped", () => {
    // Resolving a dangling pointer is core's decision, not storage's:
    // `useAccountSync` Phase A distinguishes "never chose" from "signed out".
    const map = readStoredAccountMap({
      activeAccountId: "user-9",
      accounts: { "user-1": wellFormedEntry },
    });
    expect(map!.activeAccountId).toBe("user-9");
  });

  it("degrades each present-but-invalid field to its safe default", () => {
    const map = readStoredAccountMap({
      activeAccountId: 42,
      accounts: {},
      signedOut: "false",
      deviceIdentifier: {
        platform: "web",
        subscription: { endpoint: "https://push.example/x" },
      },
      pushIdentifierProbed: "true",
    });
    expect(map).toEqual({
      activeAccountId: null,
      accounts: {},
      signedOut: false,
      deviceIdentifier: null,
      pushIdentifierProbed: false,
    });
  });

  it("leaves an ABSENT optional field absent rather than inventing a value", () => {
    // `signedOut`, `deviceIdentifier` and `pushIdentifierProbed` are optional on
    // `AccountMap` and documented to read a particular way when missing. A map
    // written before one of them existed must come back missing it — writing a
    // value would assert something no writer ever chose.
    const map = readStoredAccountMap({
      activeAccountId: "user-1",
      accounts: { "user-1": wellFormedEntry },
    });
    expect(map).toEqual({
      activeAccountId: "user-1",
      accounts: { "user-1": wellFormedEntry },
    });
    expect("signedOut" in map!).toBe(false);
    expect("deviceIdentifier" in map!).toBe(false);
    expect("pushIdentifierProbed" in map!).toBe(false);
  });
});
