import { describe, it, expect } from "vitest";

import accountsReducer, {
  setAccountMap,
  upsertAccount,
  removeAccount,
  setActiveAccount,
  setSignedOut,
  setAccountLimitReached,
  clearAllAccounts,
  setAccountsReady,
  registerAccountManager,
  setDeviceIdentifier,
  setAccountNeedsReauth,
  isAccountPushEnabled,
  accountNeedsReauth,
  MAX_ACCOUNTS,
  type AccountsState,
  type AccountEntry,
} from "./accountsSlice";

function makeEntry(overrides: Partial<AccountEntry> = {}): AccountEntry {
  return {
    refreshToken: "refresh-token",
    tokenExpiresAt: 0,
    user: { id: "user-1", name: "User One", email: null, avatar: null },
    ...overrides,
  };
}

function initialState(overrides: Partial<AccountsState> = {}): AccountsState {
  return {
    accounts: {},
    activeAccountId: null,
    deviceIdentifier: null,
    signedOut: false,
    accountLimitReached: false,
    isReady: false,
    accountManagerRegistered: false,
    ...overrides,
  };
}

describe("accountsSlice", () => {
  it("setAccountMap replaces both accounts and activeAccountId", () => {
    const state = accountsReducer(
      initialState(),
      setAccountMap({
        activeAccountId: "user-1",
        accounts: { "user-1": makeEntry() },
      }),
    );

    expect(state.activeAccountId).toBe("user-1");
    expect(state.accounts["user-1"]).toEqual(makeEntry());
  });

  it("upsertAccount adds a new account entry", () => {
    const state = accountsReducer(
      initialState(),
      upsertAccount({ userId: "user-1", entry: makeEntry() }),
    );

    expect(state.accounts["user-1"]).toEqual(makeEntry());
  });

  it("upsertAccount overwrites an existing entry for the same user", () => {
    const start = initialState({ accounts: { "user-1": makeEntry() } });
    const updated = makeEntry({ refreshToken: "new-token" });

    const state = accountsReducer(
      start,
      upsertAccount({ userId: "user-1", entry: updated }),
    );

    expect(state.accounts["user-1"]).toEqual(updated);
  });

  it("upsertAccount silently ignores a new account once MAX_ACCOUNTS is reached", () => {
    const accounts: AccountsState["accounts"] = {};
    for (let i = 0; i < MAX_ACCOUNTS; i++) {
      accounts[`user-${i}`] = makeEntry({ user: { id: `user-${i}`, name: null, email: null, avatar: null } });
    }
    const start = initialState({ accounts });

    const state = accountsReducer(
      start,
      upsertAccount({ userId: "user-overflow", entry: makeEntry() }),
    );

    expect(Object.keys(state.accounts)).toHaveLength(MAX_ACCOUNTS);
    expect(state.accounts["user-overflow"]).toBeUndefined();
    expect(state.accountLimitReached).toBe(true);
  });

  it("upsertAccount clears accountLimitReached on a successful admission", () => {
    const start = initialState({ accountLimitReached: true });

    const state = accountsReducer(
      start,
      upsertAccount({ userId: "user-1", entry: makeEntry() }),
    );

    expect(state.accountLimitReached).toBe(false);
  });

  it("removeAccount clears accountLimitReached", () => {
    const start = initialState({
      accounts: { "user-1": makeEntry(), "user-2": makeEntry() },
      activeAccountId: "user-1",
      accountLimitReached: true,
    });

    const state = accountsReducer(start, removeAccount("user-2"));

    expect(state.accountLimitReached).toBe(false);
  });

  // INVERTED (multi-account hardening): this used to assert the reducer
  // auto-selected `remaining[0]` — insertion order, i.e. the OLDEST account
  // ever added. That is the SDK making a product decision that belongs to the
  // app: "remove this account" silently landed the user inside another
  // identity. It now ends the session and leaves nothing active.
  it("removeAccount leaves NO account active when the removed one was active, even with others remaining", () => {
    const start = initialState({
      accounts: { "user-1": makeEntry(), "user-2": makeEntry() },
      activeAccountId: "user-1",
    });

    const state = accountsReducer(start, removeAccount("user-1"));

    expect(state.accounts["user-1"]).toBeUndefined();
    expect(state.accounts["user-2"]).toBeDefined();
    expect(state.activeAccountId).toBeNull();
    // ...and marks the state as deliberately signed out, so Phase A does not
    // re-create the auto-selection one launch later.
    expect(state.signedOut).toBe(true);
  });

  it("removeAccount sets activeAccountId to null when no accounts remain", () => {
    const start = initialState({
      accounts: { "user-1": makeEntry() },
      activeAccountId: "user-1",
    });

    const state = accountsReducer(start, removeAccount("user-1"));

    expect(state.activeAccountId).toBeNull();
  });

  it("removeAccount leaves activeAccountId untouched when removing a non-active account", () => {
    const start = initialState({
      accounts: { "user-1": makeEntry(), "user-2": makeEntry() },
      activeAccountId: "user-1",
    });

    const state = accountsReducer(start, removeAccount("user-2"));

    expect(state.activeAccountId).toBe("user-1");
  });

  it("setActiveAccount sets the active account id directly", () => {
    const state = accountsReducer(initialState(), setActiveAccount("user-1"));
    expect(state.activeAccountId).toBe("user-1");
  });

  it("setActiveAccount clears signedOut — activation is its defined clearing point", () => {
    const start = initialState({ signedOut: true });

    const state = accountsReducer(start, setActiveAccount("user-1"));

    expect(state.signedOut).toBe(false);
  });

  it("setActiveAccount(null) does NOT clear signedOut", () => {
    const start = initialState({ signedOut: true, activeAccountId: "user-1" });

    const state = accountsReducer(start, setActiveAccount(null));

    expect(state.signedOut).toBe(true);
  });

  it("setSignedOut sets the flag directly", () => {
    const state = accountsReducer(initialState(), setSignedOut(true));
    expect(state.signedOut).toBe(true);
  });

  it("setAccountLimitReached sets the flag directly", () => {
    const state = accountsReducer(initialState(), setAccountLimitReached(true));
    expect(state.accountLimitReached).toBe(true);
  });

  it("setAccountMap carries signedOut through, defaulting to false when absent", () => {
    const withFlag = accountsReducer(
      initialState(),
      setAccountMap({
        activeAccountId: null,
        accounts: { "user-1": makeEntry() },
        signedOut: true,
      }),
    );
    expect(withFlag.signedOut).toBe(true);

    // A map persisted before the field existed reads as "never signed out",
    // which preserves the pre-existing first-account fallback.
    const withoutFlag = accountsReducer(
      initialState({ signedOut: true }),
      setAccountMap({
        activeAccountId: "user-1",
        accounts: { "user-1": makeEntry() },
      }),
    );
    expect(withoutFlag.signedOut).toBe(false);
  });

  it("clearAllAccounts resets accounts and activeAccountId", () => {
    const start = initialState({
      accounts: { "user-1": makeEntry() },
      activeAccountId: "user-1",
    });

    const state = accountsReducer(start, clearAllAccounts());

    expect(state.accounts).toEqual({});
    expect(state.activeAccountId).toBeNull();
    // Sign-out-all is deliberate by definition.
    expect(state.signedOut).toBe(true);
  });

  it("setAccountsReady toggles isReady", () => {
    const state = accountsReducer(initialState(), setAccountsReady(true));
    expect(state.isReady).toBe(true);
  });

  it("registerAccountManager flags accountManagerRegistered", () => {
    const state = accountsReducer(initialState(), registerAccountManager());
    expect(state.accountManagerRegistered).toBe(true);
  });
});

describe("accountsSlice — Phase 5 map shape", () => {
  it("isAccountPushEnabled reads an absent flag as enabled", () => {
    // Every entry written before this field existed is absent. Reading those as
    // disabled would unbind accounts that are working fine.
    expect(isAccountPushEnabled(makeEntry())).toBe(true);
    expect(isAccountPushEnabled(makeEntry({ pushEnabled: true }))).toBe(true);
    expect(isAccountPushEnabled(makeEntry({ pushEnabled: false }))).toBe(false);
  });

  it("upsertAccount MERGES, so pushEnabled survives the refresh-token rotation that rebuilds the entry", () => {
    // This is the whole reason the merge exists: Phase B rebuilds an entry
    // literal from refreshToken + user on every launch and every transition,
    // and knows nothing about pushEnabled.
    let state = accountsReducer(
      initialState(),
      upsertAccount({
        userId: "user-1",
        entry: makeEntry({ pushEnabled: false }),
      })
    );

    state = accountsReducer(
      state,
      upsertAccount({
        userId: "user-1",
        entry: makeEntry({ refreshToken: "rotated-token" }),
      })
    );

    expect(state.accounts["user-1"].refreshToken).toBe("rotated-token");
    expect(state.accounts["user-1"].pushEnabled).toBe(false);
    expect(isAccountPushEnabled(state.accounts["user-1"])).toBe(false);
  });

  it("upsertAccount merges the summary field-wise rather than replacing it", () => {
    let state = accountsReducer(
      initialState(),
      upsertAccount({
        userId: "user-1",
        entry: makeEntry({
          user: {
            id: "user-1",
            name: "User One",
            username: "user_one",
            email: "a@b.c",
            avatar: "https://x/y.png",
          },
        }),
      })
    );

    // A rebuild whose summary omits `username` entirely must not erase it.
    state = accountsReducer(
      state,
      upsertAccount({
        userId: "user-1",
        entry: makeEntry({
          user: { id: "user-1", name: "Renamed", email: "a@b.c", avatar: null },
        }),
      })
    );

    expect(state.accounts["user-1"].user.name).toBe("Renamed");
    expect(state.accounts["user-1"].user.username).toBe("user_one");
    // An explicit null DOES overwrite — that is how a caller clears a field.
    expect(state.accounts["user-1"].user.avatar).toBeNull();
  });

  it("upsertAccount still writes a brand new entry wholesale", () => {
    const state = accountsReducer(
      initialState(),
      upsertAccount({ userId: "user-1", entry: makeEntry({ pushEnabled: false }) })
    );
    expect(state.accounts["user-1"].pushEnabled).toBe(false);
  });

  it("setAccountMap carries the device identifier through, defaulting an absent one to null", () => {
    const withId = accountsReducer(
      initialState(),
      setAccountMap({
        activeAccountId: null,
        accounts: {},
        deviceIdentifier: { platform: "ios", token: "apns-token" },
      })
    );
    expect(withId.deviceIdentifier).toEqual({
      platform: "ios",
      token: "apns-token",
    });

    const without = accountsReducer(
      withId,
      setAccountMap({ activeAccountId: null, accounts: {} })
    );
    expect(without.deviceIdentifier).toBeNull();
  });

  it("clearAllAccounts PRESERVES the device identifier", () => {
    // A device's push token does not stop being this device's token because
    // nobody is signed in — losing it would leave the next sign-in unable to
    // reconcile its bindings.
    const start = initialState({
      accounts: { "user-1": makeEntry() },
      activeAccountId: "user-1",
      deviceIdentifier: { platform: "android", token: "fcm-token" },
    });

    const state = accountsReducer(start, clearAllAccounts());

    expect(state.accounts).toEqual({});
    expect(state.deviceIdentifier).toEqual({
      platform: "android",
      token: "fcm-token",
    });
  });

  it("setDeviceIdentifier sets and clears the device identifier", () => {
    let state = accountsReducer(
      initialState(),
      setDeviceIdentifier({ platform: "ios", token: "t" })
    );
    expect(state.deviceIdentifier).toEqual({ platform: "ios", token: "t" });

    state = accountsReducer(state, setDeviceIdentifier(null));
    expect(state.deviceIdentifier).toBeNull();
  });
});

describe("accountsSlice — re-auth markers", () => {
  it("accountNeedsReauth reads an absent marker as healthy", () => {
    // Absent is "nothing has gone wrong that we know of", which is also every
    // entry written before the field existed.
    expect(accountNeedsReauth(makeEntry())).toBe(false);
    expect(accountNeedsReauth(makeEntry({ needsReauth: true }))).toBe(true);
  });

  it("setAccountNeedsReauth sets an explicit true and clears back to absent", () => {
    let state = accountsReducer(
      initialState({ accounts: { "user-1": makeEntry() } }),
      setAccountNeedsReauth({ userId: "user-1", needsReauth: true })
    );
    expect(state.accounts["user-1"].needsReauth).toBe(true);

    state = accountsReducer(
      state,
      setAccountNeedsReauth({ userId: "user-1", needsReauth: false })
    );
    // Deleted, not written as `false`: "healthy" stays the absent state the
    // merge already treats as "no opinion", and costs nothing on Expo's budget.
    expect("needsReauth" in state.accounts["user-1"]).toBe(false);
  });

  it("setAccountNeedsReauth ignores an unknown account", () => {
    const state = accountsReducer(
      initialState({ accounts: { "user-1": makeEntry() } }),
      setAccountNeedsReauth({ userId: "user-9", needsReauth: true })
    );
    expect(state.accounts["user-9"]).toBeUndefined();
  });

  // THE TRAP. Phase B rebuilds an entry literal from refreshToken + user on
  // every launch and every transition, and knows nothing about needsReauth. A
  // wholesale write would erase the marker on that cadence.
  it("upsertAccount MERGES, so needsReauth survives the entry being rebuilt", () => {
    let state = accountsReducer(
      initialState({ accounts: { "user-1": makeEntry({ needsReauth: true }) } }),
      upsertAccount({
        userId: "user-1",
        entry: makeEntry({ refreshToken: "rotated-token" }),
      })
    );

    expect(state.accounts["user-1"].refreshToken).toBe("rotated-token");
    expect(state.accounts["user-1"].needsReauth).toBe(true);

    // ...and the clearing point removes it: activating the account.
    state = accountsReducer(state, setActiveAccount("user-1"));
    expect(accountNeedsReauth(state.accounts["user-1"])).toBe(false);
  });

  // The clearing point lives in `setActiveAccount` and not in the transition
  // core precisely so it also covers the other way a dead account comes back:
  // signing into it again, which never touches the transition core.
  it("setActiveAccount clears only the activated account's marker", () => {
    const state = accountsReducer(
      initialState({
        accounts: {
          "user-1": makeEntry({ needsReauth: true }),
          "user-2": { ...makeEntry({ needsReauth: true }), user: { id: "user-2", name: null, email: null, avatar: null } },
        },
      }),
      setActiveAccount("user-1")
    );

    expect(accountNeedsReauth(state.accounts["user-1"])).toBe(false);
    expect(accountNeedsReauth(state.accounts["user-2"])).toBe(true);
  });

  it("setActiveAccount(null) clears nothing", () => {
    const state = accountsReducer(
      initialState({ accounts: { "user-1": makeEntry({ needsReauth: true }) } }),
      setActiveAccount(null)
    );
    expect(accountNeedsReauth(state.accounts["user-1"])).toBe(true);
  });

  it("setAccountMap carries stored markers through unchanged, and tolerates their absence", () => {
    const state = accountsReducer(
      initialState(),
      setAccountMap({
        activeAccountId: null,
        accounts: {
          "user-1": makeEntry({ needsReauth: true, tokenExpiresAt: 4102444800000 }),
          // An entry from a release before the marker existed.
          "user-2": { ...makeEntry(), user: { id: "user-2", name: null, email: null, avatar: null } },
        },
      })
    );

    expect(state.accounts["user-1"].needsReauth).toBe(true);
    expect(state.accounts["user-1"].tokenExpiresAt).toBe(4102444800000);
    expect(accountNeedsReauth(state.accounts["user-2"])).toBe(false);
  });
});
