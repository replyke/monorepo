import { describe, it, expect, afterEach } from "vitest";
import { act } from "@testing-library/react";

import { renderHookWithAxios, resetAxiosMocks } from "../../test-utils";
import useSignOutAll from "./useSignOutAll";
import { setAccountMap } from "../../store/slices/accountsSlice";
import type { AccountEntry } from "../../store/slices/accountsSlice";

afterEach(() => {
  resetAxiosMocks();
});

function makeAccounts(): Record<string, AccountEntry> {
  return {
    "user-1": { refreshToken: "refresh-1", tokenExpiresAt: 0, user: { id: "user-1", name: null, email: null, avatar: null } },
    "user-2": { refreshToken: "refresh-2", tokenExpiresAt: 0, user: { id: "user-2", name: null, email: null, avatar: null } },
  };
}

describe("useSignOutAll", () => {
  it("signs out every account on the server and clears all local state", async () => {
    const { result, store, axiosPublic } = renderHookWithAxios(() => useSignOutAll(), {
      accessToken: "access-1",
      refreshToken: "refresh-1",
    });
    act(() => {
      store.dispatch(setAccountMap({ activeAccountId: "user-1", accounts: makeAccounts() }));
    });

    axiosPublic.mockResponse("post", {});
    axiosPublic.mockResponse("post", {});

    await act(async () => {
      await result.current.signOutAll();
    });

    expect(store.getState().sublay.accounts.accounts).toEqual({});
    expect(store.getState().sublay.accounts.activeAccountId).toBeNull();
    expect(store.getState().sublay.auth.accessToken).toBeNull();
    expect(store.getState().sublay.auth.refreshToken).toBeNull();

    const calls = axiosPublic.calls("post");
    expect(calls).toHaveLength(2);
    expect(calls.map((c) => c.url)).toEqual([
      "/test-project/auth/sign-out",
      "/test-project/auth/sign-out",
    ]);
  });

  // INVERTED (multi-account hardening): this used to assert that a per-account
  // failure was swallowed and the WHOLE map cleared anyway. That defeats the
  // atomicity guarantee — the server refuses to unbind an account's push and
  // the SDK deletes its credential regardless, leaving the user receiving
  // notifications from it with nothing left able to stop them.
  //
  // Note the seeded device identifier: the strict rule is SCOPED to requests
  // that actually asked for an unbind. See the sibling test below.
  it("keeps the accounts whose UNBINDING sign-out failed, and rejects", async () => {
    const { result, store, axiosPublic } = renderHookWithAxios(() => useSignOutAll());
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
    axiosPublic.mockResponse("post", {});

    await expect(result.current.signOutAll()).rejects.toThrow(
      /Failed to sign out 1 of 2 accounts/,
    );

    const state = store.getState();
    // user-1 failed: it keeps its entry AND its credential so it can be retried.
    expect(state.sublay.accounts.accounts["user-1"]).toBeDefined();
    expect(state.sublay.accounts.accounts["user-1"].refreshToken).toBe("refresh-1");
    // user-2 succeeded: gone.
    expect(state.sublay.accounts.accounts["user-2"]).toBeUndefined();
    // The live session still ends — an access token is transient state, not the
    // credential the guarantee is about.
    expect(state.sublay.accounts.activeAccountId).toBeNull();
    expect(state.sublay.accounts.signedOut).toBe(true);
    expect(state.sublay.auth.accessToken).toBeNull();
  });

  // The strictness above must NOT be broadened. With no `pushDevice` there is
  // no unbind at stake, and the server answers 204 for every write/token
  // failure when none is sent — so the only remaining failure is the transport.
  // Blocking here would strand an offline user, or any app on a project with no
  // `push` bundle, unable to sign out locally at all.
  it("still clears everything when a NON-unbinding sign-out fails (offline / no push bundle)", async () => {
    const { result, store, axiosPublic } = renderHookWithAxios(() => useSignOutAll());
    act(() => {
      store.dispatch(setAccountMap({ activeAccountId: "user-1", accounts: makeAccounts() }));
    });

    axiosPublic.mockNetworkError("post");
    axiosPublic.mockResponse("post", {});

    await act(async () => {
      await result.current.signOutAll();
    });

    expect(store.getState().sublay.accounts.accounts).toEqual({});
    expect(store.getState().sublay.accounts.activeAccountId).toBeNull();
    for (const call of axiosPublic.calls("post")) {
      expect(call.body).not.toHaveProperty("pushDevice");
    }
  });

  it("sends the stored device identifier on every per-account sign-out", async () => {
    const { result, store, axiosPublic } = renderHookWithAxios(() => useSignOutAll());
    act(() => {
      store.dispatch(
        setAccountMap({
          activeAccountId: "user-1",
          accounts: makeAccounts(),
          deviceIdentifier: { platform: "android", token: "device-token-1" },
        }),
      );
    });

    axiosPublic.mockResponse("post", {});
    axiosPublic.mockResponse("post", {});

    await act(async () => {
      await result.current.signOutAll();
    });

    for (const call of axiosPublic.calls("post")) {
      expect(call.body).toMatchObject({
        pushDevice: { platform: "android", token: "device-token-1" },
      });
    }
    // The identifier is device state and survives a full sign-out-all.
    expect(store.getState().sublay.accounts.deviceIdentifier).toEqual({
      platform: "android",
      token: "device-token-1",
    });
  });

  it("throws before doing anything when there is no project", async () => {
    const { result } = renderHookWithAxios(() => useSignOutAll(), { projectId: "" });

    await expect(result.current.signOutAll()).rejects.toThrow(
      "No projectId available.",
    );
  });
});
