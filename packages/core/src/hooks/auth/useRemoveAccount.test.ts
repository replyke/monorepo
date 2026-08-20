import { describe, it, expect, afterEach } from "vitest";
import { act, waitFor } from "@testing-library/react";

import { renderHookWithAxios, resetAxiosMocks } from "../../test-utils";
import useRemoveAccount from "./useRemoveAccount";
import { setAccountMap } from "../../store/slices/accountsSlice";
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

describe("useRemoveAccount", () => {
  it("removes a non-active account without touching the current session", async () => {
    const { result, store, axiosPublic } = renderHookWithAxios(() => useRemoveAccount());
    act(() => {
      store.dispatch(setAccountMap({ activeAccountId: "user-1", accounts: makeAccounts() }));
    });

    axiosPublic.mockResponse("post", {});

    await act(async () => {
      await result.current.removeAccount({ userId: "user-2" });
    });

    expect(store.getState().sublay.accounts.accounts["user-2"]).toBeUndefined();
    expect(store.getState().sublay.accounts.activeAccountId).toBe("user-1");

    const [call] = axiosPublic.calls("post");
    expect(call.url).toBe("/test-project/auth/sign-out");
    expect(call.body).toEqual({ refreshToken: "refresh-2" });
  });

  // INVERTED (multi-account hardening): this used to assert that removing the
  // active account signed the user into the oldest remaining one. Removal now
  // ends the session and leaves nothing active.
  it("removing the active account lands signed-out and activates NO successor", async () => {
    const { result, store, axiosPublic } = renderHookWithAxios(() => useRemoveAccount(), {
      accessToken: "access-1",
      refreshToken: "refresh-1",
    });
    act(() => {
      store.dispatch(setAccountMap({ activeAccountId: "user-1", accounts: makeAccounts() }));
    });

    axiosPublic.mockResponse("post", {}); // best-effort sign-out

    await act(async () => {
      await result.current.removeAccount({ userId: "user-1" });
    });

    const state = store.getState();
    expect(state.sublay.accounts.accounts["user-1"]).toBeUndefined();
    // The other account is still there — it is simply not activated.
    expect(state.sublay.accounts.accounts["user-2"]).toBeDefined();
    expect(state.sublay.accounts.activeAccountId).toBeNull();
    expect(state.sublay.accounts.signedOut).toBe(true);
    expect(state.sublay.auth.accessToken).toBeNull();
    expect(state.sublay.auth.refreshToken).toBeNull();

    // Only the sign-out request — no refresh into a successor.
    const calls = axiosPublic.calls("post");
    expect(calls.map((c) => c.url)).toEqual(["/test-project/auth/sign-out"]);
  });

  it("removing a THIRD account leaves both survivors in the map with no session for either", async () => {
    const { result, store, axiosPublic } = renderHookWithAxios(() => useRemoveAccount(), {
      accessToken: "access-1",
      refreshToken: "refresh-1",
    });
    const three = makeAccounts();
    three["user-3"] = {
      refreshToken: "refresh-3",
      tokenExpiresAt: 0,
      user: { id: "user-3", name: "Cara", email: null, avatar: null },
    };
    act(() => {
      store.dispatch(setAccountMap({ activeAccountId: "user-1", accounts: three }));
    });

    axiosPublic.mockResponse("post", {});

    await act(async () => {
      await result.current.removeAccount({ userId: "user-1" });
    });

    const state = store.getState();
    expect(Object.keys(state.sublay.accounts.accounts).sort()).toEqual([
      "user-2",
      "user-3",
    ]);
    expect(state.sublay.accounts.activeAccountId).toBeNull();
    expect(axiosPublic.calls("post")).toHaveLength(1);
  });

  it("removing the last remaining (active) account fully resets local auth state", async () => {
    const { result, store, axiosPublic } = renderHookWithAxios(() => useRemoveAccount());
    act(() => {
      store.dispatch(
        setAccountMap({ activeAccountId: "user-1", accounts: { "user-1": makeAccounts()["user-1"] } }),
      );
    });

    axiosPublic.mockResponse("post", {});

    await act(async () => {
      await result.current.removeAccount({ userId: "user-1" });
    });

    expect(store.getState().sublay.accounts.accounts).toEqual({});
    expect(store.getState().sublay.auth.accessToken).toBeNull();
    expect(store.getState().sublay.auth.refreshToken).toBeNull();
  });

  // INVERTED (multi-account hardening): this used to assert that a failed
  // server sign-out was swallowed and the account removed locally anyway. That
  // is precisely what the atomic sign-out exists to prevent — the server can
  // refuse to unbind the push binding and the SDK would delete the credential
  // needed to retry, leaving the user receiving notifications from a removed
  // account forever.
  //
  // Note the seeded device identifier: the strict rule is SCOPED to requests
  // that actually asked for an unbind. See the sibling test below.
  it("keeps the account and its credential when an UNBINDING sign-out fails", async () => {
    const { result, store, axiosPublic } = renderHookWithAxios(() => useRemoveAccount());
    act(() => {
      store.dispatch(
        setAccountMap({
          activeAccountId: "user-1",
          accounts: makeAccounts(),
          deviceIdentifier: { platform: "ios", token: "device-token-1" },
        }),
      );
    });

    axiosPublic.mockError("post", 500, { message: "Internal error" });

    // Called directly, not inside `act()` — wrapping a rejecting call in act()
    // swallows the catch block's state update.
    await expect(
      result.current.removeAccount({ userId: "user-2" }),
    ).rejects.toBeTruthy();

    expect(store.getState().sublay.accounts.accounts["user-2"]).toBeDefined();
    expect(
      store.getState().sublay.accounts.accounts["user-2"].refreshToken,
    ).toBe("refresh-2");
    await waitFor(() => expect(result.current.error).toBeTruthy());
  });

  // The strictness above must NOT be broadened. With no `pushDevice` there is
  // no unbind, so nothing is at stake — and since the server answers 204 for
  // every write/token failure when none is sent, the only thing left that can
  // fail is the transport. Blocking here would mean an offline user, or any app
  // on a project without the `push` bundle, could never remove an account.
  it("still removes locally when a NON-unbinding sign-out fails (offline / no push bundle)", async () => {
    const { result, store, axiosPublic } = renderHookWithAxios(() => useRemoveAccount());
    act(() => {
      store.dispatch(setAccountMap({ activeAccountId: "user-1", accounts: makeAccounts() }));
    });

    axiosPublic.mockNetworkError("post");

    await act(async () => {
      await result.current.removeAccount({ userId: "user-2" });
    });

    expect(result.current.error).toBeNull();
    expect(store.getState().sublay.accounts.accounts["user-2"]).toBeUndefined();
    // And the request really did go out without a `pushDevice`.
    expect(axiosPublic.calls("post")[0].body).toEqual({
      refreshToken: "refresh-2",
    });
  });

  it("sends the stored device identifier so the server unbinds push atomically", async () => {
    const { result, store, axiosPublic } = renderHookWithAxios(() => useRemoveAccount());
    act(() => {
      store.dispatch(
        setAccountMap({
          activeAccountId: "user-1",
          accounts: makeAccounts(),
          deviceIdentifier: { platform: "ios", token: "device-token-1" },
        }),
      );
    });

    axiosPublic.mockResponse("post", {});

    await act(async () => {
      await result.current.removeAccount({ userId: "user-2" });
    });

    const [call] = axiosPublic.calls("post");
    expect(call.body).toEqual({
      refreshToken: "refresh-2",
      pushDevice: { platform: "ios", token: "device-token-1" },
    });
  });

  it("throws when the account is not found", async () => {
    const { result, store } = renderHookWithAxios(() => useRemoveAccount());
    act(() => {
      store.dispatch(setAccountMap({ activeAccountId: "user-1", accounts: makeAccounts() }));
    });

    await expect(result.current.removeAccount({ userId: "user-missing" })).rejects.toThrow(
      "Account user-missing not found",
    );
  });

  it("throws before doing anything when there is no project", async () => {
    const { result } = renderHookWithAxios(() => useRemoveAccount(), { projectId: "" });

    await expect(result.current.removeAccount({ userId: "user-1" })).rejects.toThrow(
      "No projectId available",
    );
  });
});
