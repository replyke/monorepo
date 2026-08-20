import { describe, it, expect, afterEach } from "vitest";

import {
  makeSublayStore,
  mockAxiosPublic,
  resetAxiosMocks,
} from "../../test-utils";
import {
  activateStoredAccount,
  AccountTransitionError,
} from "./accountTransition";
import { setAccountMap } from "../../store/slices/accountsSlice";
import { setTokens } from "../../store/slices/authSlice";
import { setUnreadSummary } from "../../store/slices/chatSlice";
import type { AccountEntry } from "../../store/slices/accountsSlice";

afterEach(() => {
  resetAxiosMocks();
});

function makeAccounts(): Record<string, AccountEntry> {
  return {
    "user-1": {
      refreshToken: "refresh-1",
      tokenExpiresAt: 0,
      user: { id: "user-1", name: "Alice", email: null, avatar: null },
    },
    "user-2": {
      refreshToken: "refresh-2",
      tokenExpiresAt: 0,
      user: { id: "user-2", name: "Bob", email: null, avatar: null },
    },
  };
}

/**
 * These exercise the transition core through a bare store and a bare
 * `dispatch` — no `renderHook`, no React at all. That is the point of the
 * extraction: `oauthCore` and the auth thunk bodies both need this sequence and
 * neither can call a hook.
 */
describe("activateStoredAccount (callable outside React)", () => {
  it("selects the account and establishes its session", async () => {
    const store = makeSublayStore();
    store.dispatch(
      setAccountMap({ activeAccountId: "user-1", accounts: makeAccounts() })
    );
    store.dispatch(setTokens({ accessToken: "access-1", refreshToken: "refresh-1" }));
    const axios = mockAxiosPublic();
    axios.mockResponse("post", {
      accessToken: "access-2",
      refreshToken: "refresh-2-rotated",
      user: { id: "user-2" },
    });

    const token = await activateStoredAccount({
      dispatch: store.dispatch,
      projectId: "project-1",
      userId: "user-2",
      refreshToken: "refresh-2",
      previousActiveAccountId: "user-1",
    });

    expect(token).toBe("access-2");
    const state = store.getState();
    expect(state.sublay.accounts.activeAccountId).toBe("user-2");
    expect(state.sublay.auth.accessToken).toBe("access-2");
    expect(state.sublay.auth.refreshToken).toBe("refresh-2-rotated");
    expect(state.sublay.auth.initialized).toBe(true);
    expect(state.sublay.accounts.signedOut).toBe(false);

    const [call] = axios.calls("post");
    expect(call.url).toBe("/project-1/auth/request-new-access-token");
    // The TARGET account's token, not the active one's.
    expect(call.body).toEqual({ refreshToken: "refresh-2" });
  });

  it("clears the outgoing account's feature state", async () => {
    const store = makeSublayStore();
    store.dispatch(
      setAccountMap({ activeAccountId: "user-1", accounts: makeAccounts() })
    );
    store.dispatch(
      setUnreadSummary({ totalUnread: 9, unreadConversationCount: 4 })
    );
    const axios = mockAxiosPublic();
    axios.mockResponse("post", {
      accessToken: "access-2",
      refreshToken: "refresh-2-rotated",
      user: { id: "user-2" },
    });

    await activateStoredAccount({
      dispatch: store.dispatch,
      projectId: "project-1",
      userId: "user-2",
      refreshToken: "refresh-2",
      previousActiveAccountId: "user-1",
    });

    expect(store.getState().sublay.chat.unreadConversationCount).toBeNull();
  });

  it("rejects and restores the previous SELECTION when the refresh fails", async () => {
    const store = makeSublayStore();
    store.dispatch(
      setAccountMap({ activeAccountId: "user-1", accounts: makeAccounts() })
    );
    store.dispatch(setTokens({ accessToken: "access-1", refreshToken: "refresh-1" }));
    const axios = mockAxiosPublic();
    axios.mockError("post", 403, { error: "Refresh token revoked" });

    await expect(
      activateStoredAccount({
        dispatch: store.dispatch,
        projectId: "project-1",
        userId: "user-2",
        refreshToken: "refresh-2",
        previousActiveAccountId: "user-1",
      })
    ).rejects.toBeInstanceOf(Error);

    const state = store.getState();
    // Selection restored...
    expect(state.sublay.accounts.activeAccountId).toBe("user-1");
    // ...session NOT restored. There is nothing left to restore it from by the
    // time the failure is known.
    expect(state.sublay.auth.accessToken).toBeNull();
    expect(state.sublay.auth.refreshToken).toBeNull();
    expect(state.sublay.auth.user).toBeNull();
    // Both entries survive — the failed one is the affordance for a re-auth.
    expect(Object.keys(state.sublay.accounts.accounts).sort()).toEqual([
      "user-1",
      "user-2",
    ]);
    // The gate reopens regardless.
    expect(state.sublay.auth.initialized).toBe(true);
  });

  it("rejects with AccountTransitionError when the entry has no refresh token", async () => {
    // `fulfilled`-with-`undefined`: the refresh never reaches the network, so a
    // guard on `rejected.match` alone would report success.
    const store = makeSublayStore();
    store.dispatch(
      setAccountMap({ activeAccountId: "user-1", accounts: makeAccounts() })
    );
    const axios = mockAxiosPublic();

    await expect(
      activateStoredAccount({
        dispatch: store.dispatch,
        projectId: "project-1",
        userId: "user-2",
        refreshToken: "",
        previousActiveAccountId: "user-1",
      })
    ).rejects.toBeInstanceOf(AccountTransitionError);

    expect(axios.calls("post")).toHaveLength(0);
    expect(store.getState().sublay.accounts.activeAccountId).toBe("user-1");
  });

  it("marks the state signed-out when a failed transition had no previous selection", async () => {
    const store = makeSublayStore();
    store.dispatch(
      setAccountMap({ activeAccountId: null, accounts: makeAccounts() })
    );
    const axios = mockAxiosPublic();
    axios.mockError("post", 403, { error: "Refresh token revoked" });

    await expect(
      activateStoredAccount({
        dispatch: store.dispatch,
        projectId: "project-1",
        userId: "user-2",
        refreshToken: "refresh-2",
      })
    ).rejects.toBeInstanceOf(Error);

    const state = store.getState();
    expect(state.sublay.accounts.activeAccountId).toBeNull();
    // Otherwise the next launch would silently activate the first stored
    // account — the stranding this whole change removes.
    expect(state.sublay.accounts.signedOut).toBe(true);
  });
});
