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
  // Note the response CODE: the strict rule is scoped to the server's own
  // statement that it attempted an unbind and committed nothing, not to
  // whether this client asked for one. See the two sibling tests below.
  it("keeps the account and its credential when the server REFUSES the unbind", async () => {
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

    axiosPublic.mockError("post", 500, {
      error: "Failed to deregister the push device. Nothing was signed out; retry.",
      code: "auth/device-deregistration-failed",
    });

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

  // The second of the two blocking codes: the unbind committed but the
  // token-family write failed, so the rollback took the unbind with it. Same
  // client-visible outcome — the binding survives and the credential must too.
  it("keeps the account when the rollback was triggered by the token write", async () => {
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

    axiosPublic.mockError("post", 500, {
      error: "Failed to sign out. Nothing was committed; retry.",
      code: "auth/sign-out-failed",
    });

    await expect(
      result.current.removeAccount({ userId: "user-2" }),
    ).rejects.toBeTruthy();

    expect(store.getState().sublay.accounts.accounts["user-2"]).toBeDefined();
  });

  // The regression this rule replaced: strictness used to key on whether the
  // client SENT a `pushDevice`, which is a proxy for "an unbind was attempted"
  // and a bad one. Five gates reject before the sign-out controller ever runs,
  // and none of them touches a push binding — so a project that merely blew its
  // monthly quota made every account unremovable for every user whose app had
  // called `register()`. Each of these carries a real server code, and none of
  // them is one of the two.
  it.each([
    ["quota exhaustion", 429, "project/quota-reached"],
    ["pending deletion", 423, "project/pending-deletion"],
    ["a migration window", 503, "project/migrating"],
    ["body validation", 400, "auth/invalid-body"],
    ["the generic server fault", 500, "auth/server-error"],
  ])(
    "still removes locally when the rejection is %s, which never reached the unbind",
    async (_label, status, code) => {
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

      axiosPublic.mockError("post", status as number, { code });

      await act(async () => {
        await result.current.removeAccount({ userId: "user-2" });
      });

      expect(result.current.error).toBeNull();
      expect(store.getState().sublay.accounts.accounts["user-2"]).toBeUndefined();
      // The request really did ask for an unbind — this is not the
      // no-`pushDevice` path in disguise.
      expect(axiosPublic.calls("post")[0].body).toHaveProperty("pushDevice");
    },
  );

  // A rate-limiter rejection is the one gate that answers with no body at all,
  // so it carries no code. It must still not block — and the predicate reaches
  // that answer by failing a POSITIVE membership test, never by branching on a
  // code being absent.
  it("still removes locally when the IP rate limiter rejects with no body", async () => {
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

    axiosPublic.mockError("post", 429);

    await act(async () => {
      await result.current.removeAccount({ userId: "user-2" });
    });

    expect(result.current.error).toBeNull();
    expect(store.getState().sublay.accounts.accounts["user-2"]).toBeUndefined();
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
