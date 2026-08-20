import { describe, it, expect, afterEach } from "vitest";
import { act, waitFor } from "@testing-library/react";

import { renderHookWithAxios, resetAxiosMocks, makeAuthUser } from "../../test-utils";
import useSwitchAccount from "./useSwitchAccount";
import { setAccountMap } from "../../store/slices/accountsSlice";
import type { AccountEntry } from "../../store/slices/accountsSlice";
import { setUnreadSummary } from "../../store/slices/chatSlice";

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

describe("useSwitchAccount", () => {
  it("switches to another account and requests a fresh access token for it", async () => {
    const { result, store, axiosPublic } = renderHookWithAxios(
      () => useSwitchAccount(),
      { refreshToken: "refresh-1" },
    );

    act(() => {
      store.dispatch(setAccountMap({ activeAccountId: "user-1", accounts: makeAccounts() }));
    });

    const newUser = makeAuthUser({ id: "user-2", name: "Bob" });
    axiosPublic.mockResponse("post", {
      accessToken: "access-2",
      refreshToken: "refresh-2-rotated",
      user: newUser,
    });

    await act(async () => {
      await result.current.switchAccount({ userId: "user-2" });
    });

    expect(store.getState().sublay.accounts.activeAccountId).toBe("user-2");
    expect(store.getState().sublay.auth.accessToken).toBe("access-2");
    expect(store.getState().sublay.auth.refreshToken).toBe("refresh-2-rotated");
    expect(result.current.isSwitching).toBe(false);
    expect(result.current.error).toBeNull();

    const [call] = axiosPublic.calls("post");
    expect(call.url).toBe("/test-project/auth/request-new-access-token");
    expect(call.body).toEqual({ refreshToken: "refresh-2" });
  });

  it("is a no-op when switching to the already-active account", async () => {
    const { result, store, axiosPublic } = renderHookWithAxios(() => useSwitchAccount());
    act(() => {
      store.dispatch(setAccountMap({ activeAccountId: "user-1", accounts: makeAccounts() }));
    });

    await act(async () => {
      await result.current.switchAccount({ userId: "user-1" });
    });

    expect(axiosPublic.calls("post")).toHaveLength(0);
  });

  it("throws when the target account is not in the map", async () => {
    const { result, store } = renderHookWithAxios(() => useSwitchAccount());
    act(() => {
      store.dispatch(setAccountMap({ activeAccountId: "user-1", accounts: makeAccounts() }));
    });

    await expect(
      result.current.switchAccount({ userId: "user-missing" }),
    ).rejects.toThrow("Account user-missing not found");
  });

  // INVERTED (multi-account hardening). This test used to be titled "does not
  // throw when requesting the new access token fails (swallowed inside the
  // thunk)" and asserted `error === null` with the active id already moved to
  // the target — it codified the bug: `switchAccount` reported success while
  // leaving the app pointed at an account with no session.
  //
  // NOTE ON THE HARNESS: the rejecting call is NOT wrapped in `act()`.
  // Wrapping a rejecting hook call in `act()` swallows the dispatch made from
  // the catch block, so the rollback would not be observable here.
  it("rejects and rolls the SELECTION back when requesting the new access token fails", async () => {
    const { result, store, axiosPublic } = renderHookWithAxios(() => useSwitchAccount(), {
      refreshToken: "refresh-1",
    });
    act(() => {
      store.dispatch(setAccountMap({ activeAccountId: "user-1", accounts: makeAccounts() }));
    });

    axiosPublic.mockError("post", 500, { message: "Internal error" });

    await expect(result.current.switchAccount({ userId: "user-2" })).rejects.toThrow();

    await waitFor(() => expect(result.current.isSwitching).toBe(false));
    await waitFor(() => expect(result.current.error).not.toBeNull());

    const state = store.getState();
    // Selection is back on the previous account...
    expect(state.sublay.accounts.activeAccountId).toBe("user-1");
    // ...but no session was re-established for it — that is the honest
    // terminal state, since the teardown ran before the failure was known.
    expect(state.sublay.auth.accessToken).toBeNull();
    expect(state.sublay.auth.refreshToken).toBeNull();
    // Both entries survive: the failed target stays so the app can prompt a
    // re-auth for it.
    expect(Object.keys(state.sublay.accounts.accounts).sort()).toEqual([
      "user-1",
      "user-2",
    ]);
    // The auth gate is open again regardless — withholding `initialized` would
    // park every outbound request behind the 5s fallback.
    expect(state.sublay.auth.initialized).toBe(true);
  });

  it("fails observably when the target entry carries an empty refresh token", async () => {
    // The `fulfilled`-with-`undefined` path: the refresh thunk has no
    // credential to present, so it never reaches the network. A guard on
    // `rejected.match` alone misses this entirely — which is why the guard is
    // on the payload and the thunk now rejects.
    const { result, store, axiosPublic } = renderHookWithAxios(() => useSwitchAccount());
    const accounts = makeAccounts();
    accounts["user-2"] = { ...accounts["user-2"], refreshToken: "" };
    act(() => {
      store.dispatch(setAccountMap({ activeAccountId: "user-1", accounts }));
    });

    await expect(result.current.switchAccount({ userId: "user-2" })).rejects.toThrow();

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(axiosPublic.calls("post")).toHaveLength(0);
    expect(store.getState().sublay.accounts.activeAccountId).toBe("user-1");
  });

  it("lands signed-out with nothing selected when the failed switch had no previous account", async () => {
    const { result, store, axiosPublic } = renderHookWithAxios(() => useSwitchAccount());
    act(() => {
      store.dispatch(setAccountMap({ activeAccountId: null, accounts: makeAccounts() }));
    });

    axiosPublic.mockError("post", 500, { message: "Internal error" });

    await expect(result.current.switchAccount({ userId: "user-2" })).rejects.toThrow();

    const state = store.getState();
    expect(state.sublay.accounts.activeAccountId).toBeNull();
    // Without this the next launch would silently activate the first stored
    // account — the very stranding this work removes.
    expect(state.sublay.accounts.signedOut).toBe(true);
  });

  it("clears account-scoped feature state on a successful switch", async () => {
    const { result, store, axiosPublic } = renderHookWithAxios(
      () => useSwitchAccount(),
      { refreshToken: "refresh-1" },
    );
    act(() => {
      store.dispatch(setAccountMap({ activeAccountId: "user-1", accounts: makeAccounts() }));
      store.dispatch(setUnreadSummary({ totalUnread: 12, unreadConversationCount: 7 }));
    });

    axiosPublic.mockResponse("post", {
      accessToken: "access-2",
      refreshToken: "refresh-2-rotated",
      user: makeAuthUser({ id: "user-2", name: "Bob" }),
    });

    await act(async () => {
      await result.current.switchAccount({ userId: "user-2" });
    });

    expect(store.getState().sublay.chat.unreadConversationCount).toBeNull();
    expect(store.getState().sublay.chat.totalUnreadCount).toBeNull();
  });

  it("throws before doing anything when there is no project", async () => {
    const { result } = renderHookWithAxios(() => useSwitchAccount(), { projectId: "" });

    await expect(result.current.switchAccount({ userId: "user-2" })).rejects.toThrow(
      "No projectId available",
    );
  });
});
