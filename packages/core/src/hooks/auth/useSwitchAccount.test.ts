import { describe, it, expect, afterEach } from "vitest";
import { act, waitFor } from "@testing-library/react";

import { renderHookWithAxios, resetAxiosMocks, makeAuthUser } from "../../test-utils";
import useSwitchAccount from "./useSwitchAccount";
import { AccountTransitionError } from "./accountTransition";
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

  it("is a no-op when switching to the already-active account WITH a live session", async () => {
    const { result, store, axiosPublic } = renderHookWithAxios(
      () => useSwitchAccount(),
      { accessToken: "access-1", refreshToken: "refresh-1" },
    );
    act(() => {
      store.dispatch(setAccountMap({ activeAccountId: "user-1", accounts: makeAccounts() }));
    });

    await act(async () => {
      await result.current.switchAccount({ userId: "user-1" });
    });

    // No exchange: the refresh endpoint ROTATES, so a switch into the account
    // you are already in would spend a credential for nothing.
    expect(axiosPublic.calls("post")).toHaveLength(0);
  });

  it("re-establishes the session when the selected account has none", async () => {
    // The selection can name an account whose session was torn down: a sign-in
    // refused at the account cap restores the previous selection without its
    // session, and an offline launch deliberately leaves the stored account
    // selected. Keying the early return on the SELECTION ALONE made re-tapping
    // that account a no-op, so the user's only route back into a session was to
    // restart the app.
    const { result, store, axiosPublic } = renderHookWithAxios(
      () => useSwitchAccount(),
      { accessToken: null, refreshToken: null },
    );
    act(() => {
      store.dispatch(
        setAccountMap({ activeAccountId: "user-1", accounts: makeAccounts() }),
      );
    });

    axiosPublic.mockResponse("post", {
      accessToken: "access-1-fresh",
      refreshToken: "refresh-1-rotated",
      user: makeAuthUser({ id: "user-1", name: "Alice" }),
    });

    await act(async () => {
      await result.current.switchAccount({ userId: "user-1" });
    });

    const [call] = axiosPublic.calls("post");
    expect(call.url).toBe("/test-project/auth/request-new-access-token");
    expect(call.body).toEqual({ refreshToken: "refresh-1" });

    const state = store.getState();
    expect(state.sublay.accounts.activeAccountId).toBe("user-1");
    expect(state.sublay.auth.accessToken).toBe("access-1-fresh");
    expect(state.sublay.auth.refreshToken).toBe("refresh-1-rotated");
    expect(result.current.error).toBeNull();
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

  it("types the unknown-id failure as AccountTransitionError with accountNotFound", async () => {
    // TYPED, not a bare `Error`. Every other failure on this path rejects with
    // `AccountTransitionError`, so a caller that switches on `instanceof` used
    // to fall through to its generic branch for the one failure it can actually
    // fix — a stale id. `accountNotFound` separates it from a dead credential:
    // nothing was attempted, nothing was marked, and a re-auth would not help.
    const { result, store, axiosPublic, axiosPrivate } = renderHookWithAxios(
      () => useSwitchAccount(),
      { accessToken: "access-1", refreshToken: "refresh-1" },
    );
    act(() => {
      store.dispatch(setAccountMap({ activeAccountId: "user-1", accounts: makeAccounts() }));
    });

    const error = await result.current
      .switchAccount({ userId: "user-missing" })
      .then(
        () => null,
        (err: unknown) => err,
      );

    expect(error).toBeInstanceOf(AccountTransitionError);
    expect((error as AccountTransitionError).accountNotFound).toBe(true);
    expect((error as AccountTransitionError).credentialRejected).toBe(false);

    // WHAT THE DOCS PROMISE FOR THIS PATH, asserted rather than assumed:
    // nothing was attempted and nothing was marked. The discriminant is only
    // worth branching on if it describes a real no-op.
    expect(axiosPublic.calls("post")).toHaveLength(0);
    expect(axiosPrivate.calls("post")).toHaveLength(0);

    const state = store.getState();
    expect(state.sublay.accounts.signedOut).toBe(false);
    expect(state.sublay.accounts.activeAccountId).toBe("user-1");
    expect(state.sublay.auth.accessToken).toBe("access-1");
    expect(state.sublay.accounts.accounts["user-1"].needsReauth).toBeUndefined();
    expect(state.sublay.accounts.accounts["user-2"].needsReauth).toBeUndefined();
  });

  it("switches into an account added AFTER the last render, from a callback that closed over the old map", async () => {
    // THE SNAPSHOT GAP. The guard used to read the accounts map off the render
    // snapshot this callback closes over. An account added between the render
    // and the tap — a cross-tab broadcast, a just-completed `addAccount()` in
    // a sibling component — was invisible to that snapshot, so the guard
    // rejected `accountNotFound` for an account that, by the time the call
    // actually ran, existed and was perfectly switchable. Reading the live
    // store closes that gap: the guard's answer is never older than the map.
    //
    // A REMOVAL doesn't need this same proof — the transition core re-reads
    // the live map on its own regardless of what this guard saw, so a
    // stale-but-since-removed id is caught either way. This test exercises
    // the direction only the live-store read actually changes.
    const solo: Record<string, AccountEntry> = {
      "user-1": makeAccounts()["user-1"],
    };
    const { result, store, axiosPublic } = renderHookWithAxios(
      () => useSwitchAccount(),
      { accessToken: "access-1", refreshToken: "refresh-1" },
    );
    act(() => {
      store.dispatch(setAccountMap({ activeAccountId: "user-1", accounts: solo }));
    });

    // Capture the callback from the CURRENT render — user-2 does not exist in
    // the map it closed over — then add user-2 without letting the hook
    // re-render before the call.
    const switchAccount = result.current.switchAccount;
    act(() => {
      store.dispatch(setAccountMap({ activeAccountId: "user-1", accounts: makeAccounts() }));
    });

    const newUser = makeAuthUser({ id: "user-2", name: "Bob" });
    axiosPublic.mockResponse("post", {
      accessToken: "access-2",
      refreshToken: "refresh-2-rotated",
      user: newUser,
    });

    let error: unknown = null;
    await act(async () => {
      error = await switchAccount({ userId: "user-2" }).then(() => null, (err) => err);
    });

    expect(error).toBeNull();
    expect(store.getState().sublay.accounts.activeAccountId).toBe("user-2");
    expect(store.getState().sublay.auth.accessToken).toBe("access-2");
  });

  // INVERTED TWICE. It began as "does not throw when requesting the new access
  // token fails", asserting `error === null` with the active id already moved
  // to the target. Phase 4 inverted that to "rejects and rolls the SELECTION
  // back", asserting the previous account was selected again with both tokens
  // null — an honest description of teardown-first, and of the remaining bug:
  // tapping a dead account signed the user out of the good one they were using.
  // Validate-before-commit removes that, so the honest assertion is now that
  // the current session is untouched.
  //
  // NOTE ON THE HARNESS: the rejecting call is NOT wrapped in `act()`.
  // Wrapping a rejecting hook call in `act()` swallows the dispatch made from
  // the catch block, so the marker write would not be observable here.
  it("rejects and leaves the current session fully intact when the target's credential is dead", async () => {
    const { result, store, axiosPublic } = renderHookWithAxios(() => useSwitchAccount(), {
      accessToken: "access-1",
      refreshToken: "refresh-1",
    });
    act(() => {
      store.dispatch(setAccountMap({ activeAccountId: "user-1", accounts: makeAccounts() }));
      store.dispatch(setUnreadSummary({ totalUnread: 12, unreadConversationCount: 7 }));
    });

    axiosPublic.mockError("post", 403, { error: "Refresh token revoked" });

    await expect(result.current.switchAccount({ userId: "user-2" })).rejects.toThrow();

    await waitFor(() => expect(result.current.isSwitching).toBe(false));
    await waitFor(() => expect(result.current.error).not.toBeNull());

    const state = store.getState();
    // Still signed in as user-1: selection, tokens, gate and cached feature
    // state all exactly where they were.
    expect(state.sublay.accounts.activeAccountId).toBe("user-1");
    expect(state.sublay.auth.accessToken).toBe("access-1");
    expect(state.sublay.auth.refreshToken).toBe("refresh-1");
    expect(state.sublay.auth.initialized).toBe(true);
    expect(state.sublay.accounts.signedOut).toBe(false);
    expect(state.sublay.chat.unreadConversationCount).toBe(7);
    // Both entries survive: the failed target stays so the app can prompt a
    // re-auth for it...
    expect(Object.keys(state.sublay.accounts.accounts).sort()).toEqual([
      "user-1",
      "user-2",
    ]);
    // ...and it is marked, so the switcher can say so before the next tap.
    expect(state.sublay.accounts.accounts["user-2"].needsReauth).toBe(true);
  });

  it("fails observably when the target entry carries an empty refresh token", async () => {
    // A corrupt map: there is no credential to present, so the failure never
    // reaches the network. A guard that waits for a request to fail misses this
    // entirely — which is why the check runs before anything is torn down.
    const { result, store, axiosPublic } = renderHookWithAxios(() => useSwitchAccount(), {
      accessToken: "access-1",
      refreshToken: "refresh-1",
    });
    const accounts = makeAccounts();
    accounts["user-2"] = { ...accounts["user-2"], refreshToken: "" };
    act(() => {
      store.dispatch(setAccountMap({ activeAccountId: "user-1", accounts }));
    });

    await expect(result.current.switchAccount({ userId: "user-2" })).rejects.toThrow();

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(axiosPublic.calls("post")).toHaveLength(0);
    const state = store.getState();
    expect(state.sublay.accounts.activeAccountId).toBe("user-1");
    expect(state.sublay.auth.accessToken).toBe("access-1");
    expect(state.sublay.accounts.accounts["user-2"].needsReauth).toBe(true);
  });

  // Unchanged in meaning: with nothing active there is no session to protect,
  // and the signed-out flag is what stops the next launch silently activating
  // whichever account happens to be first in the map.
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
