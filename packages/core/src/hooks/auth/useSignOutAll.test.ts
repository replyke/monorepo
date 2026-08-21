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
  // Note the response CODE: the strict rule is scoped to the server's own
  // statement that it attempted an unbind and committed nothing, not to whether
  // this client asked for one. See the two sibling tests below.
  it("keeps the accounts whose unbind the server REFUSED, and rejects", async () => {
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

    axiosPublic.mockError("post", 500, {
      error: "Failed to deregister the push device. Nothing was signed out; retry.",
      code: "auth/device-deregistration-failed",
    });
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

  // The regression the code-keyed rule fixes. Any app that has ever called
  // `register()` holds a stored identifier, so keying on `Boolean(pushDevice)`
  // made an OFFLINE sign-out-all reject and leave every account in the map —
  // the user could not sign out of their own device at all. A transport failure
  // carries no response, so no unbind was ever attempted, so nothing blocks.
  it("still clears everything when the device is OFFLINE despite a stored identifier", async () => {
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

    axiosPublic.mockNetworkError("post");
    axiosPublic.mockNetworkError("post");

    await act(async () => {
      await result.current.signOutAll();
    });

    expect(store.getState().sublay.accounts.accounts).toEqual({});
    expect(store.getState().sublay.accounts.activeAccountId).toBeNull();
    // And every request really did ask for an unbind.
    for (const call of axiosPublic.calls("post")) {
      expect(call.body).toHaveProperty("pushDevice");
    }
  });

  // Same for a gate that rejects before the sign-out controller runs: it carries
  // a code, but not one of the two, so it never touched a push binding.
  it("still clears everything when a pre-controller gate rejects", async () => {
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

    axiosPublic.mockError("post", 429, { code: "project/quota-reached" });
    axiosPublic.mockError("post", 429, { code: "project/quota-reached" });

    await act(async () => {
      await result.current.signOutAll();
    });

    expect(store.getState().sublay.accounts.accounts).toEqual({});
    expect(store.getState().sublay.accounts.activeAccountId).toBeNull();
  });

  // A mixed batch: one account's unbind is genuinely refused, the other merely
  // hit a gate. Only the refused one keeps its entry — the gated one has no
  // binding at stake and must not be stranded alongside it.
  it("keeps only the refused account when another failure never reached the unbind", async () => {
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

    // `Object.entries` order: user-1 first, user-2 second.
    axiosPublic.mockError("post", 500, {
      code: "auth/device-deregistration-failed",
    });
    axiosPublic.mockError("post", 503, { code: "project/migrating" });

    await expect(result.current.signOutAll()).rejects.toThrow(
      /Failed to sign out 1 of 2 accounts/,
    );

    const state = store.getState();
    expect(state.sublay.accounts.accounts["user-1"]).toBeDefined();
    expect(state.sublay.accounts.accounts["user-1"].refreshToken).toBe("refresh-1");
    expect(state.sublay.accounts.accounts["user-2"]).toBeUndefined();
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
