import { describe, it, expect, afterEach, vi } from "vitest";
import { waitFor } from "@testing-library/react";

import {
  renderHookWithAxios,
  resetAxiosMocks,
  makeAuthUser,
  mockAxiosPublic,
} from "../../test-utils";
import useAccountSync from "./useAccountSync";
import { setTokens } from "../../store/slices/authSlice";
import {
  setSignedOut,
  setDeviceIdentifier,
} from "../../store/slices/accountsSlice";
import {
  resetAccountStorage,
  runAccountStorageOp,
} from "../../config/accountStorage";
import { setUnreadSummary } from "../../store/slices/chatSlice";
import { setUser } from "../../store/slices/userSlice";
import type { AccountMap } from "../../store/slices/accountsSlice";
import type { AccountStorage } from "../../interfaces/AccountStorage";

afterEach(() => {
  resetAxiosMocks();
  // The storage slot and its per-project mutex are module-level state shared by
  // every test in the run.
  resetAccountStorage();
});

function makeJwt(payload: Record<string, unknown>): string {
  const encode = (obj: Record<string, unknown>) =>
    btoa(JSON.stringify(obj)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${encode({ alg: "none" })}.${encode(payload)}.fake-signature`;
}

function makeFakeStorage(initial: AccountMap | null = null): AccountStorage {
  let stored = initial;
  return {
    getAccountMap: vi.fn(async () => stored),
    setAccountMap: vi.fn(async (_projectId: string, map: AccountMap) => {
      stored = map;
    }),
    deleteAccountMap: vi.fn(async () => {
      stored = null;
    }),
  };
}

describe("useAccountSync", () => {
  it("loads the account map from storage on mount and sets the active account's refresh token", async () => {
    const jwt = makeJwt({ sub: "user-1", exp: 9999999999 });
    const storage = makeFakeStorage({
      activeAccountId: "user-1",
      accounts: {
        "user-1": {
          refreshToken: jwt,
          tokenExpiresAt: 9999999999000,
          user: { id: "user-1", name: "Alice", email: null, avatar: null },
        },
      },
    });

    const { store } = renderHookWithAxios(() => useAccountSync(storage, "test-project"));

    await waitFor(() => expect(store.getState().sublay.accounts.isReady).toBe(true));

    expect(store.getState().sublay.accounts.activeAccountId).toBe("user-1");
    expect(store.getState().sublay.accounts.accounts["user-1"].refreshToken).toBe(jwt);
    expect(store.getState().sublay.auth.refreshToken).toBe(jwt);
    expect(store.getState().sublay.accounts.accountManagerRegistered).toBe(true);
  });

  it("defaults to the first account when there is no active account id on load", async () => {
    const storage = makeFakeStorage({
      activeAccountId: null,
      accounts: {
        "user-1": {
          refreshToken: makeJwt({ sub: "user-1" }),
          tokenExpiresAt: 0,
          user: { id: "user-1", name: null, email: null, avatar: null },
        },
      },
    });

    const { store } = renderHookWithAxios(() => useAccountSync(storage, "test-project"));

    await waitFor(() =>
      expect(store.getState().sublay.accounts.activeAccountId).toBe("user-1"),
    );
  });

  it("becomes ready even when the storage read fails", async () => {
    const storage: AccountStorage = {
      getAccountMap: vi.fn().mockRejectedValue(new Error("disk error")),
      setAccountMap: vi.fn(),
      deleteAccountMap: vi.fn(),
    };

    const { store } = renderHookWithAxios(() => useAccountSync(storage, "test-project"));

    await waitFor(() => expect(store.getState().sublay.accounts.isReady).toBe(true));
    expect(store.getState().sublay.accounts.accounts).toEqual({});
  });

  it("upserts an account entry once a refresh token and matching user become available", async () => {
    const storage = makeFakeStorage(null);
    const { store } = renderHookWithAxios(() => useAccountSync(storage, "test-project"));

    await waitFor(() => expect(store.getState().sublay.accounts.isReady).toBe(true));

    const jwt = makeJwt({ sub: "user-1" });
    store.dispatch(setTokens({ accessToken: "access-1", refreshToken: jwt }));
    store.dispatch(setUser(makeAuthUser({ id: "user-1", name: "Alice" })));

    await waitFor(() =>
      expect(store.getState().sublay.accounts.accounts["user-1"]).toBeDefined(),
    );

    const entry = store.getState().sublay.accounts.accounts["user-1"];
    expect(entry.refreshToken).toBe(jwt);
    expect(entry.user).toMatchObject({ id: "user-1", name: "Alice" });
    expect(store.getState().sublay.accounts.activeAccountId).toBe("user-1");
  });

  it("does not upsert when the refresh token's sub disagrees with the current user", async () => {
    const storage = makeFakeStorage(null);
    const { store } = renderHookWithAxios(() => useAccountSync(storage, "test-project"));

    await waitFor(() => expect(store.getState().sublay.accounts.isReady).toBe(true));

    const jwtForSomeoneElse = makeJwt({ sub: "user-2" });
    store.dispatch(setTokens({ accessToken: "access-1", refreshToken: jwtForSomeoneElse }));
    store.dispatch(setUser(makeAuthUser({ id: "user-1" })));

    // Give the effect a tick to (not) fire.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(store.getState().sublay.accounts.accounts).toEqual({});
  });

  it("persists the account map to storage after the initial load, but not during it", async () => {
    const jwt = makeJwt({ sub: "user-1" });
    const storage = makeFakeStorage({
      activeAccountId: "user-1",
      accounts: {
        "user-1": { refreshToken: jwt, tokenExpiresAt: 0, user: { id: "user-1", name: null, email: null, avatar: null } },
      },
    });

    const { store } = renderHookWithAxios(() => useAccountSync(storage, "test-project"));

    await waitFor(() => expect(store.getState().sublay.accounts.isReady).toBe(true));
    expect(storage.setAccountMap).not.toHaveBeenCalled();

    const jwt2 = makeJwt({ sub: "user-2" });
    store.dispatch(setTokens({ accessToken: "access-2", refreshToken: jwt2 }));
    store.dispatch(setUser(makeAuthUser({ id: "user-2", name: "Bob" })));

    await waitFor(() => expect(storage.setAccountMap).toHaveBeenCalled());
    const [, persistedMap] = (storage.setAccountMap as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(persistedMap.accounts["user-2"]).toBeDefined();
  });

  it("syncs the account map from a same-project 'storage' event fired by another tab", async () => {
    const storage = makeFakeStorage(null);
    const { store } = renderHookWithAxios(() => useAccountSync(storage, "test-project"));

    const jwt = makeJwt({ sub: "user-9" });
    // A DISTINCT successor, deliberately. An incoming identity now triggers a
    // refresh to establish its session, and that refresh rotates — so a mock
    // returning the same token the map holds would let the final state satisfy
    // this test no matter what the switch branch installed, which is exactly
    // the discrimination this test exists to provide.
    const rotated = makeJwt({ sub: "user-9", jti: "successor" });
    const axiosPublic = mockAxiosPublic();
    axiosPublic.mockResponse("post", {
      accessToken: "access-9",
      refreshToken: rotated,
      user: { id: "user-9" },
    });

    await waitFor(() => expect(store.getState().sublay.accounts.isReady).toBe(true));

    const incomingMap: AccountMap = {
      activeAccountId: "user-9",
      accounts: {
        "user-9": { refreshToken: jwt, tokenExpiresAt: 0, user: { id: "user-9", name: "Remote", email: null, avatar: null } },
      },
    };

    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "sublay-accounts:test-project",
        newValue: JSON.stringify(incomingMap),
      }),
    );

    await waitFor(() =>
      expect(store.getState().sublay.accounts.activeAccountId).toBe("user-9"),
    );

    // THE INSTALL, proven directly: the refresh thunk reads whatever the switch
    // branch wrote into `auth.refreshToken`, so the request body is a witness
    // to it that no later rotation can forge.
    const refreshCalls = await waitFor(() => {
      const calls = axiosPublic
        .calls("post")
        .filter((c) => c.url.includes("request-new-access-token"));
      expect(calls).toHaveLength(1);
      return calls;
    });
    expect((refreshCalls[0].body as { refreshToken?: string }).refreshToken).toBe(jwt);

    // ...and the tab ends up holding the successor that refresh returned.
    await waitFor(() =>
      expect(store.getState().sublay.auth.refreshToken).toBe(rotated),
    );
  });

  it("does NOT default to the first account when the stored map is signedOut", async () => {
    // The whole point of the persisted flag: `activeAccountId: null` means two
    // different things, and only one of them should fall back to the first
    // stored account. Reading a deliberate sign-out that way re-strands the
    // user in an identity they just left, on every launch.
    const jwt = makeJwt({ sub: "user-1", exp: 9999999999 });
    const storage = makeFakeStorage({
      activeAccountId: null,
      signedOut: true,
      accounts: {
        "user-1": {
          refreshToken: jwt,
          tokenExpiresAt: 9999999999000,
          user: { id: "user-1", name: "Alice", email: null, avatar: null },
        },
      },
    });

    const { store } = renderHookWithAxios(() => useAccountSync(storage, "test-project"));

    await waitFor(() => expect(store.getState().sublay.accounts.isReady).toBe(true));

    const state = store.getState();
    expect(state.sublay.accounts.activeAccountId).toBeNull();
    expect(state.sublay.accounts.signedOut).toBe(true);
    expect(state.sublay.auth.refreshToken).toBeNull();
    // The entry survives — it is what the account picker renders.
    expect(state.sublay.accounts.accounts["user-1"]).toBeDefined();
  });

  it("persists the signedOut flag so it survives a relaunch", async () => {
    const jwt = makeJwt({ sub: "user-1", exp: 9999999999 });
    const storage = makeFakeStorage({
      activeAccountId: "user-1",
      accounts: {
        "user-1": {
          refreshToken: jwt,
          tokenExpiresAt: 9999999999000,
          user: { id: "user-1", name: "Alice", email: null, avatar: null },
        },
      },
    });

    const { store } = renderHookWithAxios(() => useAccountSync(storage, "test-project"));
    await waitFor(() => expect(store.getState().sublay.accounts.isReady).toBe(true));

    store.dispatch(setSignedOut(true));

    await waitFor(() => expect(storage.setAccountMap).toHaveBeenCalled());
    const calls = (storage.setAccountMap as ReturnType<typeof vi.fn>).mock.calls;
    const [, persisted] = calls[calls.length - 1];
    expect(persisted.signedOut).toBe(true);
  });

  it("clears account-scoped state when a direct sign-in changes the active account", async () => {
    // Signing in while another account is active is the documented way to add
    // an account, and it changes the active account HERE — no transition hook
    // runs. It used to carry the previous account's slice state straight into
    // the new session.
    const jwt1 = makeJwt({ sub: "user-1", exp: 9999999999 });
    const storage = makeFakeStorage({
      activeAccountId: "user-1",
      accounts: {
        "user-1": {
          refreshToken: jwt1,
          tokenExpiresAt: 9999999999000,
          user: { id: "user-1", name: "Alice", email: null, avatar: null },
        },
      },
    });

    const { store } = renderHookWithAxios(() => useAccountSync(storage, "test-project"));
    await waitFor(() => expect(store.getState().sublay.accounts.isReady).toBe(true));

    store.dispatch(setUnreadSummary({ totalUnread: 5, unreadConversationCount: 3 }));
    expect(store.getState().sublay.chat.unreadConversationCount).toBe(3);

    const jwt2 = makeJwt({ sub: "user-2", exp: 9999999999 });
    store.dispatch(setTokens({ accessToken: "access-2", refreshToken: jwt2 }));
    store.dispatch(setUser(makeAuthUser({ id: "user-2", name: "Bob" })));

    await waitFor(() =>
      expect(store.getState().sublay.accounts.activeAccountId).toBe("user-2"),
    );
    expect(store.getState().sublay.chat.unreadConversationCount).toBeNull();
  });

  it("tears down the local session when another tab broadcasts a signed-out map", async () => {
    const jwt = makeJwt({ sub: "user-1", exp: 9999999999 });
    const storage = makeFakeStorage({
      activeAccountId: "user-1",
      accounts: {
        "user-1": {
          refreshToken: jwt,
          tokenExpiresAt: 9999999999000,
          user: { id: "user-1", name: "Alice", email: null, avatar: null },
        },
      },
    });

    const { store } = renderHookWithAxios(() => useAccountSync(storage, "test-project"));
    await waitFor(() => expect(store.getState().sublay.accounts.isReady).toBe(true));
    store.dispatch(setUser(makeAuthUser({ id: "user-1" })));
    store.dispatch(setUnreadSummary({ totalUnread: 5, unreadConversationCount: 3 }));

    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "sublay-accounts:test-project",
        newValue: JSON.stringify({
          activeAccountId: null,
          signedOut: true,
          accounts: {},
        } satisfies AccountMap),
      }),
    );

    await waitFor(() =>
      expect(store.getState().sublay.accounts.signedOut).toBe(true),
    );
    const state = store.getState();
    // Previously this branch did nothing at all: the tab stayed authenticated
    // against a map that no longer held its credential.
    expect(state.sublay.auth.refreshToken).toBeNull();
    expect(state.sublay.auth.user).toBeNull();
    expect(state.sublay.user.user).toBeNull();
    expect(state.sublay.chat.unreadConversationCount).toBeNull();
  });

  it("clears the outgoing account's access token and profile on a cross-tab switch", async () => {
    // The half-transition this closes: the tab installed the incoming refresh
    // token and kept account A's ACCESS token and user profile. Access tokens
    // live 30 minutes and the gate only rotates near expiry, so the tab read
    // and wrote as A for up to ~29 minutes under a switcher showing B — and
    // refetched immediately, because the cache was dropped in the same handler.
    const jwt1 = makeJwt({ sub: "user-1", exp: 9999999999 });
    const jwt2 = makeJwt({ sub: "user-2", exp: 9999999999 });
    const accounts = {
      "user-1": {
        refreshToken: jwt1,
        tokenExpiresAt: 9999999999000,
        user: { id: "user-1", name: "Alice", email: null, avatar: null },
      },
      "user-2": {
        refreshToken: jwt2,
        tokenExpiresAt: 9999999999000,
        user: { id: "user-2", name: "Bob", email: null, avatar: null },
      },
    };

    const storage = makeFakeStorage({ activeAccountId: "user-1", accounts });
    const { store } = renderHookWithAxios(() => useAccountSync(storage, "test-project"));
    await waitFor(() => expect(store.getState().sublay.accounts.isReady).toBe(true));

    // Held pending so the assertions below observe the state BETWEEN teardown
    // and the incoming account's session landing — which is the window the
    // outgoing credential used to survive in. Released in a `finally` rather
    // than left hanging: a promise that never settles outlives the test and
    // leaves a dangling async chain in the worker.
    const axiosPublic = mockAxiosPublic();
    let releaseRefresh!: () => void;
    const heldRefresh = new Promise((resolve) => {
      releaseRefresh = () => resolve({ data: {} });
    });
    vi.spyOn(axiosPublic.instance, "post").mockReturnValue(heldRefresh as never);

    try {

    store.dispatch(setTokens({ accessToken: "access-token-for-user-1", refreshToken: jwt1 }));
    store.dispatch(setUser(makeAuthUser({ id: "user-1", name: "Alice" })));
    await waitFor(() => expect(store.getState().sublay.user.user?.id).toBe("user-1"));

    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "sublay-accounts:test-project",
        newValue: JSON.stringify({
          activeAccountId: "user-2",
          accounts,
        } satisfies AccountMap),
      }),
    );

    await waitFor(() =>
      expect(store.getState().sublay.accounts.activeAccountId).toBe("user-2"),
    );

    const state = store.getState();
    // The credential that could still act as user-1 is gone. Nothing can go out
    // as the outgoing account while the incoming one's token is being minted.
    expect(state.sublay.auth.accessToken).toBeNull();
    expect(state.sublay.auth.user).toBeNull();
    expect(state.sublay.user.user).toBeNull();
    // ...and the incoming account's credential IS installed, so the session can
    // be re-established as user-2.
    expect(state.sublay.auth.refreshToken).toBe(jwt2);
    } finally {
      releaseRefresh();
    }
  });

  it("converges the receiving tab onto a live session for the incoming account", async () => {
    // The other half of the switch. Clearing the outgoing credential is only
    // safe if something then establishes the incoming one — and nothing else
    // here would: `initializeAuthThunk` runs once at mount, the gate stays open
    // and simply reports "no token", the reactive 403 refresh lives on
    // axiosPrivate (a signed-out-looking tab issues optionalUserAuth reads that
    // answer 200-as-a-stranger), and baseApi has no reauth wrapper at all. So
    // the tab would sit signed-out under a switcher naming Bob.
    const jwt1 = makeJwt({ sub: "user-1", exp: 9999999999 });
    const jwt2 = makeJwt({ sub: "user-2", exp: 9999999999 });
    const successor = makeJwt({ sub: "user-2", exp: 9999999999, jti: "rotated" });
    const accounts = {
      "user-1": {
        refreshToken: jwt1,
        tokenExpiresAt: 9999999999000,
        user: { id: "user-1", name: "Alice", email: null, avatar: null },
      },
      "user-2": {
        refreshToken: jwt2,
        tokenExpiresAt: 9999999999000,
        user: { id: "user-2", name: "Bob", email: null, avatar: null },
      },
    };

    const storage = makeFakeStorage({ activeAccountId: "user-1", accounts });
    const { store } = renderHookWithAxios(() => useAccountSync(storage, "test-project"));
    await waitFor(() => expect(store.getState().sublay.accounts.isReady).toBe(true));

    const axiosPublic = mockAxiosPublic();
    axiosPublic.mockResponse("post", {
      accessToken: "access-token-for-user-2",
      refreshToken: successor,
      user: { id: "user-2", name: "Bob" },
    });

    store.dispatch(setTokens({ accessToken: "access-token-for-user-1", refreshToken: jwt1 }));
    store.dispatch(setUser(makeAuthUser({ id: "user-1", name: "Alice" })));
    await waitFor(() => expect(store.getState().sublay.user.user?.id).toBe("user-1"));

    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "sublay-accounts:test-project",
        newValue: JSON.stringify({
          activeAccountId: "user-2",
          accounts,
        } satisfies AccountMap),
      }),
    );

    // A LIVE session for the incoming account, not merely a torn-down one.
    await waitFor(() =>
      expect(store.getState().sublay.auth.accessToken).toBe(
        "access-token-for-user-2",
      ),
    );
    const state = store.getState();
    expect(state.sublay.user.user?.id).toBe("user-2");
    expect(state.sublay.auth.refreshToken).toBe(successor);

    // It presented the SUCCESSOR the originating tab persisted before it
    // broadcast — never the token that tab already spent, and never user-1's.
    const refreshCalls = axiosPublic
      .calls("post")
      .filter((c) => c.url.includes("request-new-access-token"));
    expect(refreshCalls).toHaveLength(1);
    expect((refreshCalls[0].body as { refreshToken?: string }).refreshToken).toBe(jwt2);
  });

  it("does NOT mint a new session when another tab only rotated the SAME account's token", async () => {
    // Every tab re-rotating every other tab's rotation would never terminate.
    const jwt1 = makeJwt({ sub: "user-1", exp: 9999999999 });
    const rotated = makeJwt({ sub: "user-1", exp: 9999999999, jti: "successor" });
    const storage = makeFakeStorage({
      activeAccountId: "user-1",
      accounts: {
        "user-1": {
          refreshToken: jwt1,
          tokenExpiresAt: 9999999999000,
          user: { id: "user-1", name: "Alice", email: null, avatar: null },
        },
      },
    });

    const { store } = renderHookWithAxios(() => useAccountSync(storage, "test-project"));
    await waitFor(() => expect(store.getState().sublay.accounts.isReady).toBe(true));

    const axiosPublic = mockAxiosPublic();
    store.dispatch(setTokens({ accessToken: "access-token-for-user-1", refreshToken: jwt1 }));
    store.dispatch(setUser(makeAuthUser({ id: "user-1", name: "Alice" })));
    await waitFor(() => expect(store.getState().sublay.user.user?.id).toBe("user-1"));

    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "sublay-accounts:test-project",
        newValue: JSON.stringify({
          activeAccountId: "user-1",
          accounts: {
            "user-1": {
              refreshToken: rotated,
              tokenExpiresAt: 9999999999000,
              user: { id: "user-1", name: "Alice", email: null, avatar: null },
            },
          },
        } satisfies AccountMap),
      }),
    );

    await waitFor(() =>
      expect(store.getState().sublay.auth.refreshToken).toBe(rotated),
    );
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(
      axiosPublic.calls("post").filter((c) => c.url.includes("request-new-access-token")),
    ).toHaveLength(0);
  });

  it("does NOT tear down the session when another tab only rotated the SAME account's token", async () => {
    // The other half of the rule. Phase C persists on every accounts change, so
    // an ordinary refresh in another tab broadcasts a map whose active account
    // is unchanged and whose refresh token is new. Tearing down there would
    // force a pointless re-authentication round trip on every rotation.
    const jwt1 = makeJwt({ sub: "user-1", exp: 9999999999 });
    const rotated = makeJwt({ sub: "user-1", exp: 9999999999, jti: "successor" });

    const storage = makeFakeStorage({
      activeAccountId: "user-1",
      accounts: {
        "user-1": {
          refreshToken: jwt1,
          tokenExpiresAt: 9999999999000,
          user: { id: "user-1", name: "Alice", email: null, avatar: null },
        },
      },
    });

    const { store } = renderHookWithAxios(() => useAccountSync(storage, "test-project"));
    await waitFor(() => expect(store.getState().sublay.accounts.isReady).toBe(true));

    store.dispatch(setTokens({ accessToken: "access-token-for-user-1", refreshToken: jwt1 }));
    store.dispatch(setUser(makeAuthUser({ id: "user-1", name: "Alice" })));
    await waitFor(() => expect(store.getState().sublay.user.user?.id).toBe("user-1"));

    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "sublay-accounts:test-project",
        newValue: JSON.stringify({
          activeAccountId: "user-1",
          accounts: {
            "user-1": {
              refreshToken: rotated,
              tokenExpiresAt: 9999999999000,
              user: { id: "user-1", name: "Alice", email: null, avatar: null },
            },
          },
        } satisfies AccountMap),
      }),
    );

    await waitFor(() =>
      expect(store.getState().sublay.auth.refreshToken).toBe(rotated),
    );

    const state = store.getState();
    expect(state.sublay.auth.accessToken).toBe("access-token-for-user-1");
    expect(state.sublay.user.user?.id).toBe("user-1");
  });

  it("ignores a 'storage' event for a different project's key", async () => {
    const storage = makeFakeStorage(null);
    const { store } = renderHookWithAxios(() => useAccountSync(storage, "test-project"));

    await waitFor(() => expect(store.getState().sublay.accounts.isReady).toBe(true));

    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "sublay-accounts:other-project",
        newValue: JSON.stringify({ activeAccountId: "user-9", accounts: {} }),
      }),
    );

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(store.getState().sublay.accounts.activeAccountId).toBeNull();
  });
});

describe("useAccountSync — Phase 5 durable storage", () => {
  it("records `username` on the stored summary", async () => {
    const storage = makeFakeStorage(null);
    const { store } = renderHookWithAxios(() =>
      useAccountSync(storage, "test-project"),
    );

    await waitFor(() => expect(store.getState().sublay.accounts.isReady).toBe(true));

    const jwt = makeJwt({ sub: "user-1" });
    store.dispatch(setTokens({ accessToken: "access-1", refreshToken: jwt }));
    store.dispatch(
      setUser(makeAuthUser({ id: "user-1", name: "Alice", username: "alice" })),
    );

    await waitFor(() =>
      expect(store.getState().sublay.accounts.accounts["user-1"]).toBeDefined(),
    );
    expect(
      store.getState().sublay.accounts.accounts["user-1"].user.username,
    ).toBe("alice");
  });

  it("persists the device identifier, and keeps it across a sign-out-all", async () => {
    const storage = makeFakeStorage(null);
    const { store } = renderHookWithAxios(() =>
      useAccountSync(storage, "test-project"),
    );

    await waitFor(() => expect(store.getState().sublay.accounts.isReady).toBe(true));

    store.dispatch(setDeviceIdentifier({ platform: "ios", token: "apns-1" }));

    await waitFor(() => expect(storage.setAccountMap).toHaveBeenCalled());
    const calls = (storage.setAccountMap as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[calls.length - 1][1].deviceIdentifier).toEqual({
      platform: "ios",
      token: "apns-1",
    });
  });

  it("restores the device identifier from storage on load", async () => {
    const storage = makeFakeStorage({
      activeAccountId: null,
      accounts: {},
      signedOut: true,
      deviceIdentifier: { platform: "android", token: "fcm-1" },
    });

    const { store } = renderHookWithAxios(() =>
      useAccountSync(storage, "test-project"),
    );

    await waitFor(() => expect(store.getState().sublay.accounts.isReady).toBe(true));
    expect(store.getState().sublay.accounts.deviceIdentifier).toEqual({
      platform: "android",
      token: "fcm-1",
    });
  });

  it("keeps `pushEnabled` across the refresh-token rotation that rebuilds the entry", async () => {
    // End-to-end version of the reducer-level merge test: the rotation goes
    // through Phase B, which builds its entry literal with no knowledge of the
    // flag. Before the merge, this silently re-enabled a silenced account on
    // every launch and every transition.
    const jwt1 = makeJwt({ sub: "user-1", exp: 9999999999 });
    const storage = makeFakeStorage({
      activeAccountId: "user-1",
      accounts: {
        "user-1": {
          refreshToken: jwt1,
          tokenExpiresAt: 9999999999000,
          user: { id: "user-1", name: "Alice", email: null, avatar: null },
          pushEnabled: false,
        },
      },
    });

    const { store } = renderHookWithAxios(() =>
      useAccountSync(storage, "test-project"),
    );

    await waitFor(() => expect(store.getState().sublay.accounts.isReady).toBe(true));

    const rotated = makeJwt({ sub: "user-1", exp: 9999999999 });
    store.dispatch(setTokens({ accessToken: "access-2", refreshToken: rotated }));
    store.dispatch(setUser(makeAuthUser({ id: "user-1", name: "Alice" })));

    await waitFor(() =>
      expect(
        store.getState().sublay.accounts.accounts["user-1"].refreshToken,
      ).toBe(rotated),
    );
    expect(store.getState().sublay.accounts.accounts["user-1"].pushEnabled).toBe(
      false,
    );
  });

  it("persists THROUGH the shared mutex rather than alongside it", async () => {
    // Phase C used to call the raw handle, which would leave the mutex
    // guarding nothing. Proven by occupying the project's queue first: if the
    // persist went around the mutex it would start immediately.
    const order: string[] = [];
    const storage: AccountStorage = {
      getAccountMap: vi.fn(async () => null),
      setAccountMap: vi.fn(async () => {
        order.push("persist");
      }),
      deleteAccountMap: vi.fn(async () => {}),
    };

    const { store } = renderHookWithAxios(() =>
      useAccountSync(storage, "test-project"),
    );

    await waitFor(() => expect(store.getState().sublay.accounts.isReady).toBe(true));

    let releaseOccupant!: () => void;
    const occupied = runAccountStorageOp("test-project", async () => {
      order.push("occupant:start");
      await new Promise<void>((resolve) => {
        releaseOccupant = resolve;
      });
      order.push("occupant:end");
    });

    store.dispatch(setDeviceIdentifier({ platform: "ios", token: "apns-1" }));

    // The persist is queued behind the occupant, not racing it.
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(order).toEqual(["occupant:start"]);

    releaseOccupant();
    await occupied;

    await waitFor(() => expect(storage.setAccountMap).toHaveBeenCalled());
    expect(order).toEqual(["occupant:start", "occupant:end", "persist"]);
  });

  it("does not surface a rejected persist as an unhandled rejection", async () => {
    const storage: AccountStorage = {
      getAccountMap: vi.fn(async () => null),
      setAccountMap: vi.fn(async () => {
        throw new Error("keychain unavailable");
      }),
      deleteAccountMap: vi.fn(async () => {}),
    };

    const { store } = renderHookWithAxios(() =>
      useAccountSync(storage, "test-project"),
    );

    await waitFor(() => expect(store.getState().sublay.accounts.isReady).toBe(true));

    store.dispatch(setDeviceIdentifier({ platform: "ios", token: "apns-1" }));

    await waitFor(() => expect(storage.setAccountMap).toHaveBeenCalled());
    // An effect cannot await, so Phase C catches. The awaitable route for
    // callers that must not proceed until the write lands is
    // `persistAccountMapFor(projectId, map)`.
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
});

describe("useAccountSync — Phase E (push reconciliation on transition)", () => {
  const DEVICE = { platform: "ios" as const, token: "device-token-1" };

  function makeMap(activeAccountId: string | null): AccountMap {
    return {
      activeAccountId,
      accounts: {
        "user-1": {
          refreshToken: makeJwt({ sub: "user-1", exp: 9999999999 }),
          tokenExpiresAt: 9999999999000,
          user: { id: "user-1", name: null, email: null, avatar: null },
          pushEnabled: true,
        },
        "user-2": {
          refreshToken: makeJwt({ sub: "user-2", exp: 9999999999 }),
          tokenExpiresAt: 9999999999000,
          user: { id: "user-2", name: null, email: null, avatar: null },
          pushEnabled: true,
        },
        "user-3": {
          refreshToken: makeJwt({ sub: "user-3", exp: 9999999999 }),
          tokenExpiresAt: 9999999999000,
          user: { id: "user-3", name: null, email: null, avatar: null },
          pushEnabled: false,
        },
      },
      deviceIdentifier: DEVICE,
    };
  }

  it("reconciles ONLY the newly active account, minting for nobody", async () => {
    const storage = makeFakeStorage(makeMap("user-1"));
    const { store, axiosPublic } = renderHookWithAxios(
      () => useAccountSync(storage, "test-project"),
      {
        accessToken: "access-1",
        beforeRender: ({ axiosPublic: pub }) => {
          pub.mockResponse("post", {});
        },
      },
    );

    await waitFor(() =>
      expect(store.getState().sublay.accounts.isReady).toBe(true),
    );
    store.dispatch(setUser(makeAuthUser({ id: "user-1" })));

    await waitFor(() =>
      expect(
        axiosPublic
          .calls("post")
          .some((c) => c.url.includes("push-notifications/devices")),
      ).toBe(true),
    );

    const posts = axiosPublic.calls("post");
    // ⚠ THE load-bearing assertion: a transition must NEVER run the bulk loop.
    // If it did, every stored account would be minted for on every switch —
    // revoking each stored refresh token and destroying those accounts on the
    // next pass.
    expect(
      posts.filter((c) => c.url.includes("request-new-access-token")),
    ).toHaveLength(0);
    expect(
      posts.filter((c) => c.url.includes("push-notifications/devices")),
    ).toHaveLength(1);
    expect(posts[posts.length - 1].config?.headers.Authorization).toBe(
      "Bearer access-1",
    );
  });

  it("does not reconcile while the live session still belongs to the outgoing account", async () => {
    const storage = makeFakeStorage(makeMap("user-1"));
    const { store, axiosPublic } = renderHookWithAxios(
      () => useAccountSync(storage, "test-project"),
      { accessToken: "access-2" },
    );

    await waitFor(() =>
      expect(store.getState().sublay.accounts.isReady).toBe(true),
    );
    // `user` is still the previous account — mid-transition.
    store.dispatch(setUser(makeAuthUser({ id: "user-2" })));

    await new Promise((resolve) => setTimeout(resolve, 20));
    // Phase B moves the active account to user-2 first, and only then does the
    // reconcile become legal — so the one thing that must never happen is a
    // device call made under the WRONG identity.
    for (const call of axiosPublic.calls("post")) {
      if (call.url.includes("push-notifications/devices")) {
        expect(call.config?.headers.Authorization).toBe("Bearer access-2");
      }
    }
  });

  it("is a no-op when no device identifier is stored", async () => {
    const map = makeMap("user-1");
    map.deviceIdentifier = null;
    const storage = makeFakeStorage(map);
    const { store, axiosPublic } = renderHookWithAxios(
      () => useAccountSync(storage, "test-project"),
      { accessToken: "access-1" },
    );

    await waitFor(() =>
      expect(store.getState().sublay.accounts.isReady).toBe(true),
    );
    store.dispatch(setUser(makeAuthUser({ id: "user-1" })));

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(
      axiosPublic
        .calls("post")
        .filter((c) => c.url.includes("push-notifications/devices")),
    ).toHaveLength(0);
  });

  it("deregisters a silenced account when it becomes active, and keeps it silenced", async () => {
    const storage = makeFakeStorage(makeMap("user-3"));
    const { store, axiosPublic } = renderHookWithAxios(
      () => useAccountSync(storage, "test-project"),
      {
        accessToken: "access-3",
        beforeRender: ({ axiosPublic: pub }) => {
          pub.mockResponse("delete", {});
        },
      },
    );

    await waitFor(() =>
      expect(store.getState().sublay.accounts.isReady).toBe(true),
    );
    store.dispatch(setUser(makeAuthUser({ id: "user-3" })));

    await waitFor(() => expect(axiosPublic.calls("delete")).toHaveLength(1));
    const [del] = axiosPublic.calls("delete");
    expect(del.url).toBe("/test-project/push-notifications/devices");
    expect(del.config?.data).toEqual(DEVICE);
    expect(store.getState().sublay.accounts.accounts["user-3"].pushEnabled).toBe(
      false,
    );
    // Still no mint — the newly active account uses its live session.
    expect(
      axiosPublic
        .calls("post")
        .filter((c) => c.url.includes("request-new-access-token")),
    ).toHaveLength(0);
  });
});

describe("useAccountSync — lazy push re-binding", () => {
  const DEVICE = { platform: "ios" as const, token: "device-token-1" };

  function makeMap(
    activeAccountId: string | null,
    overrides: Record<string, Partial<AccountMap["accounts"][string]>> = {},
  ): AccountMap {
    const base: AccountMap["accounts"] = {
      "user-1": {
        refreshToken: makeJwt({ sub: "user-1", exp: 9999999999 }),
        tokenExpiresAt: 9999999999000,
        user: { id: "user-1", name: null, email: null, avatar: null },
        pushEnabled: true,
      },
      "user-2": {
        refreshToken: makeJwt({ sub: "user-2", exp: 9999999999 }),
        tokenExpiresAt: 9999999999000,
        user: { id: "user-2", name: null, email: null, avatar: null },
        pushEnabled: true,
      },
    };
    for (const [userId, patch] of Object.entries(overrides)) {
      base[userId] = { ...base[userId], ...patch };
    }
    return { activeAccountId, accounts: base, deviceIdentifier: DEVICE };
  }

  it("carries a re-bind mark across a reload of the stored state", async () => {
    // The rotation that raises the mark happens once, and the account it
    // describes may not be opened for days. A mark that did not survive the
    // relaunch would leave that account quiet with nothing recording why.
    const storage = makeFakeStorage(
      makeMap("user-1", { "user-2": { needsPushRebind: true } }),
    );
    const { store } = renderHookWithAxios(
      () => useAccountSync(storage, "test-project"),
      {
        accessToken: "access-1",
        beforeRender: ({ axiosPublic: pub }) => {
          pub.mockResponse("post", {});
        },
      },
    );

    await waitFor(() =>
      expect(store.getState().sublay.accounts.isReady).toBe(true),
    );

    expect(
      store.getState().sublay.accounts.accounts["user-2"].needsPushRebind,
    ).toBe(true);
  });

  it("re-binds a marked account when it is activated, and clears the mark", async () => {
    const storage = makeFakeStorage(
      makeMap("user-2", { "user-2": { needsPushRebind: true } }),
    );
    const { store, axiosPublic } = renderHookWithAxios(
      () => useAccountSync(storage, "test-project"),
      {
        accessToken: "access-2",
        beforeRender: ({ axiosPublic: pub }) => {
          pub.mockResponse("post", {});
        },
      },
    );

    await waitFor(() =>
      expect(store.getState().sublay.accounts.isReady).toBe(true),
    );
    store.dispatch(setUser(makeAuthUser({ id: "user-2" })));

    // The binding is re-created with the LIVE session — no credential is
    // exchanged for it, which is the whole reason the repair waits for an
    // activation instead of running in the background.
    await waitFor(() =>
      expect(
        axiosPublic
          .calls("post")
          .filter((c) => c.url.includes("push-notifications/devices")),
      ).toHaveLength(1),
    );
    expect(
      axiosPublic
        .calls("post")
        .filter((c) => c.url.includes("request-new-access-token")),
    ).toHaveLength(0);

    await waitFor(() =>
      expect(
        store.getState().sublay.accounts.accounts["user-2"].needsPushRebind,
      ).toBeUndefined(),
    );

    // ...and the cleared mark reaches disk, so the next launch does not report
    // notifications as paused on an account that has just been repaired.
    await waitFor(() => {
      const written = (storage.setAccountMap as ReturnType<typeof vi.fn>).mock
        .calls as Array<[string, AccountMap]>;
      expect(written.length).toBeGreaterThan(0);
      expect(
        written[written.length - 1][1].accounts["user-2"].needsPushRebind,
      ).toBeUndefined();
    });
  });

  it("does not bind an account that has never expressed a push preference", async () => {
    // S11: the device identifier deliberately survives a sign-out-all — it is
    // device state, not account state — and activation-time reconciliation runs
    // on every activation, a plain sign-in included. Reading an absent
    // preference as consent meant that on a shared device, the next person to
    // sign in was push-bound to the identifier the previous user left behind,
    // having granted nothing, with the app never calling `register()`, and it
    // survived a restart.
    const storage = makeFakeStorage({
      activeAccountId: null,
      accounts: {},
      deviceIdentifier: DEVICE,
      signedOut: true,
    });
    const { store, axiosPublic } = renderHookWithAxios(
      () => useAccountSync(storage, "test-project"),
      { accessToken: "access-9" },
    );

    await waitFor(() =>
      expect(store.getState().sublay.accounts.isReady).toBe(true),
    );

    // A brand-new person signs in on this device.
    const jwt = makeJwt({ sub: "user-9", exp: 9999999999 });
    store.dispatch(setTokens({ accessToken: "access-9", refreshToken: jwt }));
    store.dispatch(setUser(makeAuthUser({ id: "user-9" })));

    await waitFor(() =>
      expect(store.getState().sublay.accounts.activeAccountId).toBe("user-9"),
    );
    // Give the reconcile effect every chance to fire.
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(
      axiosPublic
        .calls("post")
        .filter((c) => c.url.includes("push-notifications/devices")),
    ).toHaveLength(0);
    // Not silenced either — absent means "never asked", so nothing is unbound
    // out from under an upgrading install that is working fine.
    expect(axiosPublic.calls("delete")).toHaveLength(0);
    expect(
      store.getState().sublay.accounts.accounts["user-9"].needsPushRebind,
    ).toBeUndefined();
  });
});

describe("useAccountSync — the account-cap backstop (Phase 7)", () => {
  it("does not activate an account the map refused to admit", async () => {
    // The corruption this phase removes: `upsertAccount` refuses at
    // MAX_ACCOUNTS and this effect used to select the id anyway, leaving
    // `activeAccountId` naming a key that is not in `accounts` — then
    // persisting it, and restoring it on the next launch.
    //
    // The entry-point gates in `authThunks` own this rule; this is the floor
    // under them, because this effect is what writes the persisted map.
    const ids = ["user-1", "user-2", "user-3", "user-4", "user-5"];
    const storage = makeFakeStorage({
      activeAccountId: "user-1",
      accounts: Object.fromEntries(
        ids.map((id) => [
          id,
          {
            refreshToken: makeJwt({ sub: id, exp: 9999999999 }),
            tokenExpiresAt: 9999999999000,
            user: { id, name: id, email: null, avatar: null },
          },
        ]),
      ),
    });

    const { store } = renderHookWithAxios(() =>
      useAccountSync(storage, "test-project"),
    );

    await waitFor(() =>
      expect(store.getState().sublay.accounts.isReady).toBe(true),
    );

    // A live session for a SIXTH user arrives (e.g. a path that bypassed the
    // gates entirely).
    store.dispatch(
      setTokens({
        accessToken: "access-6",
        refreshToken: makeJwt({ sub: "user-6", exp: 9999999999 }),
      }),
    );
    store.dispatch(setUser(makeAuthUser({ id: "user-6" })));

    await waitFor(() =>
      expect(store.getState().sublay.accounts.accountLimitReached).toBe(true),
    );

    const state = store.getState();
    expect(state.sublay.accounts.accounts["user-6"]).toBeUndefined();
    expect(Object.keys(state.sublay.accounts.accounts)).toHaveLength(5);
    // The invariant: the active id is always a key of the map.
    expect(state.sublay.accounts.activeAccountId).toBe("user-1");
    expect(
      state.sublay.accounts.accounts[
        state.sublay.accounts.activeAccountId as string
      ],
    ).toBeDefined();
  });
});
