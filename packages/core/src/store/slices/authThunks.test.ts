import { describe, it, expect, afterEach } from "vitest";

import { makeSublayStore, mockAxiosPublic, resetAxiosMocks } from "../../test-utils";
import {
  signUpWithEmailAndPasswordThunk,
  signInWithEmailAndPasswordThunk,
  signOutThunk,
  requestNewAccessTokenThunk,
  changePasswordThunk,
  setPasswordThunk,
  confirmAccountDeletionThunk,
  initializeAuthThunk,
  verifyExternalUserThunk,
  completeOAuthSignInThunk,
  ACCOUNT_LIMIT_MESSAGE,
} from "./authThunks";
import { setTokens, setUser } from "./authSlice";
import { setAccountMap, setAccountLimitReached } from "./accountsSlice";
import { selectUser as selectUserSliceUser } from "./userSlice";
import {
  armAuthGate,
  syncAuthGate,
  setAuthGateRefresher,
} from "../../config/authGate";
import type { AuthUser } from "../../interfaces/models/User";
import type { PushDeviceIdentifier } from "../../interfaces/PushTokenAdapter";

afterEach(() => {
  // Also resets the auth gate — the module-level latches are shared across a run.
  resetAxiosMocks();
});

/** Minimal unsigned JWT — only `exp`/`sub` are read. Negative = already expired. */
function jwtExpiringIn(seconds: number, sub = "user-1") {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  return `${encode({ alg: "HS256" })}.${encode({
    sub,
    exp: Math.floor((Date.now() + seconds * 1000) / 1000),
  })}.sig`;
}

describe("signUpWithEmailAndPasswordThunk", () => {
  it("stores the returned tokens/user and syncs the user slice", async () => {
    const store = makeSublayStore();
    const axios = mockAxiosPublic();
    const user = { id: "user-1" } as AuthUser;
    axios.mockResponse("post", { accessToken: "access-1", refreshToken: "refresh-1", user });

    const result = await store.dispatch(
      signUpWithEmailAndPasswordThunk({
        projectId: "project-1",
        email: "a@b.com",
        password: "secret",
      }),
    );

    expect(signUpWithEmailAndPasswordThunk.fulfilled.match(result)).toBe(true);
    const state = store.getState();
    expect(state.sublay.auth.accessToken).toBe("access-1");
    expect(state.sublay.auth.refreshToken).toBe("refresh-1");
    expect(state.sublay.auth.user).toEqual(user);
    expect(state.sublay.auth.isAuthenticating).toBe(false);
    expect(selectUserSliceUser(state)).toEqual(user);

    expect(axios.calls("post")[0].url).toBe("/project-1/auth/sign-up");
  });
});

describe("signInWithEmailAndPasswordThunk", () => {
  it("stores tokens/user on success", async () => {
    const store = makeSublayStore();
    const axios = mockAxiosPublic();
    const user = { id: "user-1" } as AuthUser;
    axios.mockResponse("post", { accessToken: "access-1", refreshToken: "refresh-1", user });

    const result = await store.dispatch(
      signInWithEmailAndPasswordThunk({
        projectId: "project-1",
        email: "a@b.com",
        password: "secret",
      }),
    );

    expect(signInWithEmailAndPasswordThunk.fulfilled.match(result)).toBe(true);
    expect(store.getState().sublay.auth.accessToken).toBe("access-1");
  });

  it("rejects with the error message and resets isAuthenticating on failure", async () => {
    const store = makeSublayStore();
    const axios = mockAxiosPublic();
    axios.mockError("post", 401, { message: "Invalid credentials" });

    const result = await store.dispatch(
      signInWithEmailAndPasswordThunk({
        projectId: "project-1",
        email: "a@b.com",
        password: "wrong",
      }),
    );

    expect(signInWithEmailAndPasswordThunk.rejected.match(result)).toBe(true);
    const state = store.getState();
    expect(state.sublay.auth.accessToken).toBeNull();
    expect(state.sublay.auth.isAuthenticating).toBe(false);
  });
});

describe("signOutThunk", () => {
  it("throws a guard error when there is no refresh token", async () => {
    const store = makeSublayStore();

    const result = await store.dispatch(signOutThunk({ projectId: "project-1" }));

    expect(signOutThunk.rejected.match(result)).toBe(true);
    // The expect above is the assertion; this guard only narrows the
    // fulfilled|rejected union so `.error` is readable.
    if (!signOutThunk.rejected.match(result)) {
      throw new Error("expected signOutThunk to reject");
    }
    expect(result.error.message).toBe("No refresh token");
  });

  it("resets auth state on a standard sign-out (no other accounts)", async () => {
    const store = makeSublayStore();
    store.dispatch(setTokens({ accessToken: "access-1", refreshToken: "refresh-1" }));
    store.dispatch(setUser({ id: "user-1" } as AuthUser));
    const axios = mockAxiosPublic();
    axios.mockResponse("post", {});

    const result = await store.dispatch(signOutThunk({ projectId: "project-1" }));

    expect(signOutThunk.fulfilled.match(result)).toBe(true);
    const state = store.getState();
    expect(state.sublay.auth.accessToken).toBeNull();
    expect(state.sublay.auth.refreshToken).toBeNull();
    expect(state.sublay.auth.user).toBeNull();
    expect(axios.calls("post")[0].url).toBe("/project-1/auth/sign-out");
  });

  // INVERTED (multi-account hardening): this used to assert that signing out
  // of the active account immediately signed the user INTO the oldest
  // remaining one and refreshed its token. Sign-out now ends the session and
  // leaves nothing active; which identity comes next is the app's call.
  it("ends the session and activates NO successor when other accounts remain", async () => {
    const store = makeSublayStore();
    store.dispatch(setTokens({ accessToken: "access-1", refreshToken: "refresh-1" }));
    store.dispatch(
      setAccountMap({
        activeAccountId: "user-1",
        accounts: {
          "user-1": {
            refreshToken: "refresh-1",
            tokenExpiresAt: Date.now() + 100_000,
            user: { id: "user-1", name: "A", email: null, avatar: null },
          },
          "user-2": {
            refreshToken: "refresh-2",
            tokenExpiresAt: Date.now() + 100_000,
            user: { id: "user-2", name: "B", email: null, avatar: null },
          },
        },
      }),
    );
    const axios = mockAxiosPublic();
    axios.mockResponse("post", {});

    const result = await store.dispatch(signOutThunk({ projectId: "project-1" }));

    expect(signOutThunk.fulfilled.match(result)).toBe(true);
    const state = store.getState();

    // Signed out, with no successor session.
    expect(state.sublay.auth.accessToken).toBeNull();
    expect(state.sublay.auth.refreshToken).toBeNull();
    expect(state.sublay.accounts.activeAccountId).toBeNull();
    expect(state.sublay.accounts.signedOut).toBe(true);

    // The remaining account survives untouched, ready to be picked.
    expect(state.sublay.accounts.accounts["user-1"]).toBeUndefined();
    expect(state.sublay.accounts.accounts["user-2"]).toBeDefined();

    // Exactly one request: the sign-out. No refresh into a successor.
    const urls = axios.calls("post").map((c) => c.url);
    expect(urls).toEqual(["/project-1/auth/sign-out"]);
  });
});

/**
 * The atomicity contract on the path apps actually use.
 *
 * `useAuth().signOut()` dispatches `signOutThunk`, and until these tests
 * existed BOTH halves of its behavior could be deleted with the suite green:
 * neither existing test seeds a `deviceIdentifier` or asserts the request body,
 * so the `pushDevice` could stop being sent (the binding survives the sign-out
 * and the credential needed to fix it is deleted) and the refusal could stop
 * blocking teardown (same outcome, from the other direction). `useRemoveAccount`
 * and `useSignOutAll` both had this pair; the primary API had neither.
 */
describe("signOutThunk — the push atomicity contract", () => {
  /** Seeds a signed-in account plus a stored device identifier. */
  function seedSignedIn(
    store: ReturnType<typeof makeSublayStore>,
    deviceIdentifier: PushDeviceIdentifier,
  ) {
    store.dispatch(setTokens({ accessToken: "access-1", refreshToken: "refresh-1" }));
    store.dispatch(setUser({ id: "user-1" } as AuthUser));
    store.dispatch(
      setAccountMap({
        activeAccountId: "user-1",
        accounts: {
          "user-1": {
            refreshToken: "refresh-1",
            tokenExpiresAt: Date.now() + 100_000,
            user: { id: "user-1", name: "A", email: null, avatar: null },
          },
        },
        deviceIdentifier,
      }),
    );
  }

  it("sends the stored device identifier so the server unbinds push atomically", async () => {
    const store = makeSublayStore();
    seedSignedIn(store, { platform: "ios", token: "device-token-1" });
    const axios = mockAxiosPublic();
    axios.mockResponse("post", {});

    const result = await store.dispatch(signOutThunk({ projectId: "project-1" }));

    expect(signOutThunk.fulfilled.match(result)).toBe(true);
    expect(axios.calls("post")[0].body).toEqual({
      refreshToken: "refresh-1",
      pushDevice: { platform: "ios", token: "device-token-1" },
    });
  });

  // Web is the shape that would fail silently if the identifier were mangled:
  // on ios the server's `deriveDeviceKey` is the identity function, so a broken
  // derivation still matches, while a web subscription is hashed. Every other
  // client sign-out test uses a native platform, so a web-only defect in what
  // this path sends would pass unnoticed.
  it("sends a WEB device identifier as a whole subscription object", async () => {
    const store = makeSublayStore();
    const subscription = {
      endpoint: "https://push.example.com/sub-abc",
      keys: { p256dh: "p256dh-key", auth: "auth-key" },
    };
    seedSignedIn(store, { platform: "web", subscription });
    const axios = mockAxiosPublic();
    axios.mockResponse("post", {});

    const result = await store.dispatch(signOutThunk({ projectId: "project-1" }));

    expect(signOutThunk.fulfilled.match(result)).toBe(true);
    expect(axios.calls("post")[0].body).toEqual({
      refreshToken: "refresh-1",
      pushDevice: { platform: "web", subscription },
    });
  });

  // The blocking half. The server states it attempted the unbind and committed
  // nothing, so the account and its credential must both survive — tearing down
  // here deletes the only credential that could ever retry, leaving the user
  // receiving notifications from an account they can no longer reach.
  it.each([
    ["the unbind itself failed", "auth/device-deregistration-failed"],
    ["the token write rolled the unbind back", "auth/sign-out-failed"],
  ])("keeps the account and its credential when %s", async (_label, code) => {
    const store = makeSublayStore();
    seedSignedIn(store, { platform: "ios", token: "device-token-1" });
    const axios = mockAxiosPublic();
    axios.mockError("post", 500, { error: "Nothing was committed; retry.", code });

    const result = await store.dispatch(signOutThunk({ projectId: "project-1" }));

    expect(signOutThunk.rejected.match(result)).toBe(true);

    const state = store.getState();
    // Nothing below the sign-out call ran: entry, credential and session all
    // survive so the user can retry.
    expect(state.sublay.accounts.accounts["user-1"]).toBeDefined();
    expect(state.sublay.accounts.accounts["user-1"].refreshToken).toBe("refresh-1");
    expect(state.sublay.accounts.activeAccountId).toBe("user-1");
    expect(state.sublay.accounts.signedOut).toBe(false);
    expect(state.sublay.auth.refreshToken).toBe("refresh-1");
  });

  // The non-blocking half, and the reason this path had to change: it used to
  // reject on EVERY failure while the other two sign-out paths did not, so an
  // offline user could not sign out at all through the primary API.
  it("signs out locally when the device is OFFLINE despite a stored identifier", async () => {
    const store = makeSublayStore();
    seedSignedIn(store, { platform: "ios", token: "device-token-1" });
    const axios = mockAxiosPublic();
    axios.mockNetworkError("post");

    const result = await store.dispatch(signOutThunk({ projectId: "project-1" }));

    expect(signOutThunk.fulfilled.match(result)).toBe(true);

    const state = store.getState();
    expect(state.sublay.accounts.accounts["user-1"]).toBeUndefined();
    expect(state.sublay.accounts.activeAccountId).toBeNull();
    expect(state.sublay.accounts.signedOut).toBe(true);
    expect(state.sublay.auth.refreshToken).toBeNull();
    // The request really did ask for an unbind — this is not the
    // no-`pushDevice` path in disguise.
    expect(axios.calls("post")[0].body).toHaveProperty("pushDevice");
  });

  // Every gate that rejects before the sign-out controller runs. None of them
  // touches a push binding, so none may block. `auth/server-error` covers the
  // push-availability lookup, which fails closed into the controller's generic
  // catch — a sign-out must still succeed when that lookup itself fails.
  it.each([
    ["quota exhaustion", 429, "project/quota-reached"],
    ["pending deletion", 423, "project/pending-deletion"],
    ["a migration window", 503, "project/migrating"],
    ["body validation", 400, "auth/invalid-body"],
    ["a failed push-availability lookup", 500, "auth/server-error"],
  ])("signs out locally when the rejection is %s", async (_label, status, code) => {
    const store = makeSublayStore();
    seedSignedIn(store, { platform: "ios", token: "device-token-1" });
    const axios = mockAxiosPublic();
    axios.mockError("post", status as number, { code });

    const result = await store.dispatch(signOutThunk({ projectId: "project-1" }));

    expect(signOutThunk.fulfilled.match(result)).toBe(true);
    expect(store.getState().sublay.accounts.accounts["user-1"]).toBeUndefined();
    expect(store.getState().sublay.accounts.signedOut).toBe(true);
  });
});

describe("requestNewAccessTokenThunk", () => {
  // INVERTED (multi-account hardening): this used to FULFIL with an undefined
  // payload, which made every caller guarding on `fulfilled.match` read "there
  // is no credential to refresh with" as a successful refresh. That is the
  // defect behind the whole unwrap-site class: an entry with an empty or
  // missing refresh token switched cleanly into a session that did not exist.
  it("rejects — rather than fulfilling — when there is no refresh token", async () => {
    const store = makeSublayStore();
    const axios = mockAxiosPublic();

    const result = await store.dispatch(requestNewAccessTokenThunk({ projectId: "project-1" }));

    expect(requestNewAccessTokenThunk.rejected.match(result)).toBe(true);
    expect(result.payload).toBe("No refresh token available");
    expect(axios.calls("post")).toHaveLength(0);
  });

  it("rotates the access and refresh tokens on success", async () => {
    const store = makeSublayStore();
    store.dispatch(setTokens({ accessToken: "stale", refreshToken: "refresh-1" }));
    const axios = mockAxiosPublic();
    const user = { id: "user-1" } as AuthUser;
    axios.mockResponse("post", { accessToken: "fresh", refreshToken: "refresh-2", user });

    const result = await store.dispatch(requestNewAccessTokenThunk({ projectId: "project-1" }));

    expect(requestNewAccessTokenThunk.fulfilled.match(result)).toBe(true);
    expect(result.payload).toBe("fresh");
    const state = store.getState();
    expect(state.sublay.auth.accessToken).toBe("fresh");
    expect(state.sublay.auth.refreshToken).toBe("refresh-2");
  });
});

describe("changePasswordThunk", () => {
  it("rejects with a readable payload when no user is authenticated", async () => {
    const store = makeSublayStore();

    const result = await store.dispatch(
      changePasswordThunk({ projectId: "project-1", password: "old", newPassword: "new" }),
    );

    expect(changePasswordThunk.rejected.match(result)).toBe(true);
    // Regression: this guard used to `throw`, which leaves `payload` undefined —
    // and `useAuth` rethrows `new Error(result.payload)`, so the caller saw
    // literally "Error: undefined" instead of the reason.
    expect(result.payload).toBe("No user is authenticated");
  });

  it("succeeds when a user is authenticated", async () => {
    const store = makeSublayStore();
    store.dispatch(setUser({ id: "user-1" } as AuthUser));
    store.dispatch(setTokens({ accessToken: "access-1", refreshToken: "refresh-1" }));
    const axios = mockAxiosPublic();
    axios.mockResponse("post", {});

    const result = await store.dispatch(
      changePasswordThunk({ projectId: "project-1", password: "old", newPassword: "new" }),
    );

    expect(changePasswordThunk.fulfilled.match(result)).toBe(true);
    expect(store.getState().sublay.auth.isAuthenticating).toBe(false);
    // Regression: change-password runs behind requireUserAuth and must carry the
    // bearer even though it goes through the default (tokenless) axios instance.
    expect(axios.calls("post")[0].url).toBe("/project-1/auth/change-password");
    expect(axios.calls("post")[0].config?.headers?.Authorization).toBe(
      "Bearer access-1",
    );
    // ...and NAMES THIS DEVICE'S SESSION. A password change ends every other
    // session for the user, and the server cannot tell which one is asking —
    // an access token carries no `jti` and is not stored — so without this
    // field the caller is signed out of the app they are standing in at their
    // next refresh, which is the outcome this whole behaviour exists to avoid.
    expect(axios.calls("post")[0].body).toEqual({
      password: "old",
      newPassword: "new",
      refreshToken: "refresh-1",
    });
  });

  it("sends the ROTATED refresh token when the gate rotated one on the way in", async () => {
    // `withAuth` runs the request through the auth gate, which pre-emptively
    // rotates a near-expiry access token — and that exchange rotates the
    // REFRESH token with it. Reading the value from the pre-gate snapshot
    // therefore names a session the server has already superseded.
    const store = makeSublayStore();
    store.dispatch(setUser({ id: "user-1" } as AuthUser));
    store.dispatch(
      setTokens({
        accessToken: jwtExpiringIn(-60),
        refreshToken: "refresh-1",
      }),
    );
    const axios = mockAxiosPublic();

    armAuthGate();
    syncAuthGate({ accessToken: jwtExpiringIn(-60), initialized: true });
    setAuthGateRefresher(async () => {
      // What a real rotation does: writes the successor into the store.
      store.dispatch(
        setTokens({ accessToken: "access-2", refreshToken: "refresh-2" }),
      );
      syncAuthGate({ accessToken: "access-2", initialized: true });
      return "access-2";
    });

    axios.mockResponse("post", {});

    const result = await store.dispatch(
      changePasswordThunk({
        projectId: "project-1",
        password: "old",
        newPassword: "new",
      }),
    );

    expect(changePasswordThunk.fulfilled.match(result)).toBe(true);
    const [call] = axios.calls("post");
    expect(call.config?.headers?.Authorization).toBe("Bearer access-2");
    expect((call.body as { refreshToken?: string }).refreshToken).toBe(
      "refresh-2",
    );
  });

  it("still changes the password when no refresh token can be resolved", async () => {
    // Fail-secure, not an error: with no session named, the server destroys
    // every family for the user — this one included. A client that cannot name
    // its session must still be able to change the password.
    const store = makeSublayStore();
    store.dispatch(setUser({ id: "user-1" } as AuthUser));
    store.dispatch(setTokens({ accessToken: "access-1", refreshToken: null }));
    const axios = mockAxiosPublic();
    axios.mockResponse("post", {});

    const result = await store.dispatch(
      changePasswordThunk({
        projectId: "project-1",
        password: "old",
        newPassword: "new",
      }),
    );

    expect(changePasswordThunk.fulfilled.match(result)).toBe(true);
    expect(axios.calls("post")[0].body).toEqual({
      password: "old",
      newPassword: "new",
    });
  });
});

describe("setPasswordThunk", () => {
  it("rejects with a readable payload when no user is authenticated", async () => {
    const store = makeSublayStore();

    const result = await store.dispatch(
      setPasswordThunk({ projectId: "project-1", newPassword: "new" }),
    );

    expect(setPasswordThunk.rejected.match(result)).toBe(true);
    expect(result.payload).toBe("No user is authenticated");
  });

  it("succeeds when a user is authenticated", async () => {
    const store = makeSublayStore();
    store.dispatch(setUser({ id: "user-1" } as AuthUser));
    store.dispatch(setTokens({ accessToken: "access-1", refreshToken: "refresh-1" }));
    const axios = mockAxiosPublic();
    axios.mockResponse("post", {});

    const result = await store.dispatch(
      setPasswordThunk({ projectId: "project-1", newPassword: "new" }),
    );

    expect(setPasswordThunk.fulfilled.match(result)).toBe(true);
    expect(store.getState().sublay.auth.isAuthenticating).toBe(false);
    expect(axios.calls("post")[0].url).toBe("/project-1/auth/set-password");
    // Regression: set-password runs behind requireUserAuth and must carry the
    // bearer even though it goes through the default (tokenless) axios instance.
    expect(axios.calls("post")[0].config?.headers?.Authorization).toBe(
      "Bearer access-1",
    );
  });
});

describe("confirmAccountDeletionThunk", () => {
  it("sends the confirmation code with the bearer, then tears down the session", async () => {
    const store = makeSublayStore();
    store.dispatch(setUser({ id: "user-1" } as AuthUser));
    store.dispatch(setTokens({ accessToken: "access-1", refreshToken: "refresh-1" }));
    const axios = mockAxiosPublic();
    axios.mockResponse("post", {});

    const result = await store.dispatch(
      confirmAccountDeletionThunk({ projectId: "project-1", code: "123456" }),
    );

    expect(confirmAccountDeletionThunk.fulfilled.match(result)).toBe(true);
    expect(axios.calls("post")[0].url).toBe(
      "/project-1/auth/confirm-account-deletion",
    );
    expect(axios.calls("post")[0].body).toEqual({ code: "123456" });
    // Regression: confirm-account-deletion runs behind requireUserAuth and must
    // carry the bearer even though it goes through the default axios instance.
    expect(axios.calls("post")[0].config?.headers?.Authorization).toBe(
      "Bearer access-1",
    );
    // Session is torn down after a successful deletion.
    expect(store.getState().sublay.auth.accessToken).toBeNull();
    expect(store.getState().sublay.auth.user).toBeNull();
  });

  // These three account-management endpoints post through the default axios
  // instance, which carries no interceptors — so unlike every other authed
  // call they get their token from the gate directly. The two tests below lock
  // in the guarantees that buys; see the `withAuth` comment in authThunks.ts.
  it("holds the request until the bootstrap settles, then sends the token that arrived", async () => {
    // A deletion-code deep link cold-boots the app straight onto the confirm
    // screen: the thunk fires while `accessToken` is still null. Before the
    // gate, that posted with no Authorization header at all and took a bare
    // 401 with nothing to retry it.
    const store = makeSublayStore();
    store.dispatch(setUser({ id: "user-1" } as AuthUser));
    const axios = mockAxiosPublic();
    axios.mockResponse("post", {});

    armAuthGate();
    syncAuthGate({ accessToken: null, initialized: false });

    const pending = store.dispatch(
      confirmAccountDeletionThunk({ projectId: "project-1", code: "123456" }),
    );

    // Bounded flush — enough for the request to have gone out if nothing held it.
    await Promise.resolve();
    await Promise.resolve();
    expect(axios.calls("post")).toHaveLength(0);

    const arrived = jwtExpiringIn(1800);
    syncAuthGate({ accessToken: arrived, initialized: true });

    const result = await pending;
    expect(confirmAccountDeletionThunk.fulfilled.match(result)).toBe(true);
    expect(axios.calls("post")[0].config?.headers?.Authorization).toBe(
      `Bearer ${arrived}`,
    );
  });
});

describe("account-management thunks — cold start", () => {
  // The signed-in check used to run BEFORE the gate, so a screen opened while
  // the bootstrap was still in flight rejected instantly with "No user is
  // authenticated" — even though the user was signed in and a refresh token was
  // sitting in storage. Both thunks must wait, then judge.
  it.each([
    [
      "changePasswordThunk",
      changePasswordThunk,
      { projectId: "project-1", password: "old", newPassword: "new" },
      "/project-1/auth/change-password",
    ],
    [
      "setPasswordThunk",
      setPasswordThunk,
      { projectId: "project-1", newPassword: "new" },
      "/project-1/auth/set-password",
    ],
  ] as const)(
    "%s waits for the bootstrap instead of rejecting on a null user",
    async (_name, thunk, args, url) => {
      const store = makeSublayStore();
      const axios = mockAxiosPublic();
      axios.mockResponse("post", {});

      armAuthGate();
      syncAuthGate({ accessToken: null, initialized: false });

      // Note: no setUser / setTokens yet — that is exactly the cold-start state.
      const pending = store.dispatch(thunk(args as never));

      await Promise.resolve();
      await Promise.resolve();
      expect(axios.calls("post")).toHaveLength(0);

      // The bootstrap lands: user and token arrive together.
      const arrived = jwtExpiringIn(1800);
      store.dispatch(setUser({ id: "user-1" } as AuthUser));
      store.dispatch(
        setTokens({ accessToken: arrived, refreshToken: "refresh-1" }),
      );
      syncAuthGate({ accessToken: arrived, initialized: true });

      const result = await pending;
      expect(thunk.fulfilled.match(result)).toBe(true);
      expect(axios.calls("post")[0].url).toBe(url);
      expect(axios.calls("post")[0].config?.headers?.Authorization).toBe(
        `Bearer ${arrived}`,
      );
    },
  );

  it("still rejects once the bootstrap confirms nobody is signed in", async () => {
    // The wait must not turn into a blanket allow: if the bootstrap settles with
    // no user, the local error is still the right answer.
    const store = makeSublayStore();
    const axios = mockAxiosPublic();
    axios.mockResponse("post", {});

    armAuthGate();
    syncAuthGate({ accessToken: null, initialized: false });

    const pending = store.dispatch(
      changePasswordThunk({
        projectId: "project-1",
        password: "old",
        newPassword: "new",
      }),
    );

    syncAuthGate({ accessToken: null, initialized: true });

    const result = await pending;
    expect(changePasswordThunk.rejected.match(result)).toBe(true);
    expect(result.payload).toBe("No user is authenticated");
    expect(axios.calls("post")).toHaveLength(0);
  });
});

describe("account-management thunks — account switched mid-flight", () => {
  it("refuses to send when the token that arrives belongs to a different account", async () => {
    const store = makeSublayStore();
    const ownToken = jwtExpiringIn(1800, "user-1");
    store.dispatch(setUser({ id: "user-1" } as AuthUser));
    store.dispatch(
      setTokens({ accessToken: ownToken, refreshToken: "refresh-1" }),
    );
    const axios = mockAxiosPublic();
    axios.mockResponse("post", {});

    armAuthGate();
    syncAuthGate({ accessToken: ownToken, initialized: true });

    // The switch begins after the thunk read its token: the gate re-closes,
    // parking the request mid-flight.
    syncAuthGate({ accessToken: null, initialized: false });

    const pending = store.dispatch(
      setPasswordThunk({ projectId: "project-1", newPassword: "new" }),
    );

    await Promise.resolve();
    await Promise.resolve();
    expect(axios.calls("post")).toHaveLength(0);

    // The switch completes — the gate reopens holding user-2's token.
    const otherToken = jwtExpiringIn(1800, "user-2");
    store.dispatch(setUser({ id: "user-2" } as AuthUser));
    syncAuthGate({ accessToken: otherToken, initialized: true });

    const result = await pending;

    expect(setPasswordThunk.rejected.match(result)).toBe(true);
    expect(result.payload).toMatch(/active account changed/i);
    // The point of the guard: user-2's password was never touched.
    expect(axios.calls("post")).toHaveLength(0);
  });

  it("proceeds when the arriving token is a rotation of the same account", async () => {
    // Pre-emptive rotation mints a NEW token string for the SAME `sub`. That
    // must not read as a switch, or every idle-expiry recovery would break.
    const store = makeSublayStore();
    const expired = jwtExpiringIn(-60, "user-1");
    store.dispatch(setUser({ id: "user-1" } as AuthUser));
    store.dispatch(
      setTokens({ accessToken: expired, refreshToken: "refresh-1" }),
    );
    const axios = mockAxiosPublic();
    axios.mockResponse("post", {});

    const rotated = jwtExpiringIn(1800, "user-1");
    armAuthGate();
    setAuthGateRefresher(async () => rotated);
    syncAuthGate({ accessToken: expired, initialized: true });

    const result = await store.dispatch(
      setPasswordThunk({ projectId: "project-1", newPassword: "new" }),
    );

    expect(setPasswordThunk.fulfilled.match(result)).toBe(true);
    expect(axios.calls("post")[0].config?.headers?.Authorization).toBe(
      `Bearer ${rotated}`,
    );
  });
});

describe("account-management thunks — idle expiry", () => {
  it("rotates an expired token before sending rather than posting the stale one", async () => {
    // Access tokens live 30 minutes. A settings screen opened after an idle
    // stretch holds an expired-but-non-null token in Redux; the `user` guard
    // passes, so nothing upstream catches it. The default axios instance has no
    // response interceptor, so the resulting bare 403 was unrecoverable — the
    // retry button re-read the same dead token and failed identically.
    const store = makeSublayStore();
    store.dispatch(setUser({ id: "user-1" } as AuthUser));
    const expired = jwtExpiringIn(-60);
    store.dispatch(
      setTokens({ accessToken: expired, refreshToken: "refresh-1" }),
    );
    const axios = mockAxiosPublic();
    axios.mockResponse("post", {});

    const rotated = jwtExpiringIn(1800);
    armAuthGate();
    setAuthGateRefresher(async () => rotated);
    syncAuthGate({ accessToken: expired, initialized: true });

    const result = await store.dispatch(
      changePasswordThunk({
        projectId: "project-1",
        password: "old",
        newPassword: "new",
      }),
    );

    expect(changePasswordThunk.fulfilled.match(result)).toBe(true);
    expect(axios.calls("post")[0].config?.headers?.Authorization).toBe(
      `Bearer ${rotated}`,
    );
  });
});

describe("initializeAuthThunk", () => {
  // CHANGED: this used to assert that a successful verify was followed by a
  // redundant refresh. `verifyExternalUserThunk` already dispatches setTokens
  // (access AND refresh) plus setUser, so the second call established nothing —
  // it only spent a refresh token minted milliseconds earlier, because the
  // exchange rotates.
  it("verifies the signed token and stops there — the verify already established the session", async () => {
    const store = makeSublayStore();
    store.dispatch(setTokens({ accessToken: null, refreshToken: "refresh-1" }));
    const axios = mockAxiosPublic();
    const user = { id: "user-1" } as AuthUser;
    axios.mockResponse("post", { accessToken: "from-verify", refreshToken: "refresh-2", user });

    await store.dispatch(initializeAuthThunk({ projectId: "project-1", signedToken: "jwt" }));

    const state = store.getState();
    expect(state.sublay.auth.initialized).toBe(true);
    expect(state.sublay.auth.accessToken).toBe("from-verify");
    expect(state.sublay.auth.refreshToken).toBe("refresh-2");
    expect(selectUserSliceUser(state)).toEqual(user);

    const urls = axios.calls("post").map((c) => c.url);
    expect(urls).toEqual(["/project-1/auth/verify-external-user"]);
  });

  // REGRESSION GUARD. Landing signed-out is the right answer for a STORED
  // token that turned out to be dead. It is the wrong answer for a session
  // minted milliseconds ago: a blip on the post-verify refresh would have torn
  // down a perfectly good session, and an integration-mode app has no stored
  // accounts and no picker to recover through — and this thunk does not re-run.
  it("does NOT tear down a just-minted external-user session (no post-verify refresh exists to fail)", async () => {
    const store = makeSublayStore();
    const axios = mockAxiosPublic();
    const user = { id: "user-1" } as AuthUser;
    axios.mockResponse("post", { accessToken: "from-verify", refreshToken: "refresh-2", user });
    // Queued but must never be reached: if a second call were made, this is
    // the network blip that used to sign the user out.
    axios.mockError("post", 503, { error: "Service unavailable" });

    const result = await store.dispatch(
      initializeAuthThunk({ projectId: "project-1", signedToken: "jwt" }),
    );

    expect(initializeAuthThunk.fulfilled.match(result)).toBe(true);

    const state = store.getState();
    expect(axios.calls("post")).toHaveLength(1);
    // The session minted seconds ago is intact.
    expect(state.sublay.auth.accessToken).toBe("from-verify");
    expect(state.sublay.auth.refreshToken).toBe("refresh-2");
    expect(state.sublay.auth.user).toEqual(user);
    expect(selectUserSliceUser(state)).toEqual(user);
    // ...and the teardown did NOT run.
    expect(state.sublay.accounts.signedOut).toBe(false);
    expect(state.sublay.auth.initialized).toBe(true);
  });

  it("falls through to the stored-account refresh when the verify itself fails", async () => {
    // A rejected verify keeps the pre-existing behavior: a stored account may
    // still be restorable.
    const store = makeSublayStore();
    store.dispatch(setTokens({ accessToken: null, refreshToken: "refresh-1" }));
    const axios = mockAxiosPublic();
    axios.mockError("post", 401, { error: "Invalid signed token" });
    axios.mockResponse("post", {
      accessToken: "from-refresh",
      refreshToken: "refresh-2",
      user: { id: "user-1" } as AuthUser,
    });

    await store.dispatch(initializeAuthThunk({ projectId: "project-1", signedToken: "jwt" }));

    const state = store.getState();
    expect(state.sublay.auth.accessToken).toBe("from-refresh");
    expect(state.sublay.accounts.signedOut).toBe(false);
    expect(state.sublay.auth.initialized).toBe(true);

    const urls = axios.calls("post").map((c) => c.url);
    expect(urls).toEqual([
      "/project-1/auth/verify-external-user",
      "/project-1/auth/request-new-access-token",
    ]);
  });

  it("skips verify-external-user and still refreshes when there is no signed token", async () => {
    const store = makeSublayStore();
    store.dispatch(setTokens({ accessToken: null, refreshToken: "refresh-1" }));
    const axios = mockAxiosPublic();
    axios.mockResponse("post", { accessToken: "from-refresh", refreshToken: "refresh-2", user: null });

    await store.dispatch(initializeAuthThunk({ projectId: "project-1" }));

    expect(store.getState().sublay.auth.initialized).toBe(true);
    const urls = axios.calls("post").map((c) => c.url);
    expect(urls).toEqual(["/project-1/auth/request-new-access-token"]);
  });

  it("does not attempt a refresh at all when nothing is stored", async () => {
    // A first launch is not a failure, and must not be recorded as a
    // deliberate sign-out.
    const store = makeSublayStore();
    const axios = mockAxiosPublic();

    const result = await store.dispatch(initializeAuthThunk({ projectId: "project-1" }));

    // A first launch FULFILS — it is not a failure and must not read as one.
    expect(initializeAuthThunk.fulfilled.match(result)).toBe(true);

    const state = store.getState();
    expect(axios.calls("post")).toHaveLength(0);
    expect(state.sublay.auth.initialized).toBe(true);
    expect(state.sublay.accounts.signedOut).toBe(false);
  });

  it("lands signed-out — entries intact — when the stored refresh token is dead", async () => {
    // The launch path used to have ZERO observability here: the un-unwrapped
    // dispatch resolved even for a rejected thunk, so the `catch` was dead
    // code and an expired stored token reproduced the stranded state on EVERY
    // launch, silently.
    const store = makeSublayStore();
    store.dispatch(setTokens({ accessToken: null, refreshToken: "refresh-1" }));
    store.dispatch(
      setAccountMap({
        activeAccountId: "user-1",
        accounts: {
          "user-1": {
            refreshToken: "refresh-1",
            tokenExpiresAt: 0,
            user: { id: "user-1", name: "A", email: null, avatar: null },
          },
          "user-2": {
            refreshToken: "refresh-2",
            tokenExpiresAt: 0,
            user: { id: "user-2", name: "B", email: null, avatar: null },
          },
        },
      }),
    );
    const axios = mockAxiosPublic();
    axios.mockError("post", 403, { error: "Refresh token revoked" });

    const result = await store.dispatch(initializeAuthThunk({ projectId: "project-1" }));

    // The reason is REACHABLE, not merely logged: an app can tell "your stored
    // session expired" apart from "you signed out", which otherwise look
    // identical (both land on `signedOut: true`).
    expect(initializeAuthThunk.rejected.match(result)).toBe(true);
    // Guard only narrows the fulfilled|rejected union so `.error` is readable.
    if (!initializeAuthThunk.rejected.match(result)) {
      throw new Error("expected initializeAuthThunk to reject");
    }
    expect(result.error.message).toBeTruthy();

    const state = store.getState();
    // Signed out...
    expect(state.sublay.auth.accessToken).toBeNull();
    expect(state.sublay.auth.refreshToken).toBeNull();
    expect(state.sublay.accounts.activeAccountId).toBeNull();
    // ...observably, so the next launch shows the picker instead of silently
    // re-activating the first stored account.
    expect(state.sublay.accounts.signedOut).toBe(true);
    // ...with both entries intact, so the user can re-authenticate either one.
    expect(Object.keys(state.sublay.accounts.accounts).sort()).toEqual([
      "user-1",
      "user-2",
    ]);
    // ...and the one the server REFUSED is marked, so a switcher can show it as
    // needing a sign-in without waiting for the user to tap it and fail again.
    expect(state.sublay.accounts.accounts["user-1"].needsReauth).toBe(true);
    expect(state.sublay.accounts.accounts["user-2"].needsReauth).toBeUndefined();
    // The request-path auth gate STILL opens. Withholding this would park
    // every outbound request behind the 5s ready-timeout fallback.
    expect(state.sublay.auth.initialized).toBe(true);
  });

  it("lands signed-out when the selected account's refresh token is empty", async () => {
    // The `fulfilled`-with-`undefined` path — no network call happens at all,
    // so a guard on `rejected.match` would never see it. An account IS
    // selected, so this is a corrupt entry, not a fresh launch.
    const store = makeSublayStore();
    store.dispatch(setTokens({ accessToken: "stale", refreshToken: "" }));
    store.dispatch(
      setAccountMap({
        activeAccountId: "user-1",
        accounts: {
          "user-1": {
            refreshToken: "",
            tokenExpiresAt: 0,
            user: { id: "user-1", name: "A", email: null, avatar: null },
          },
        },
      }),
    );
    const axios = mockAxiosPublic();

    const result = await store.dispatch(initializeAuthThunk({ projectId: "project-1" }));

    expect(initializeAuthThunk.rejected.match(result)).toBe(true);
    if (!initializeAuthThunk.rejected.match(result)) {
      throw new Error("expected initializeAuthThunk to reject");
    }
    expect(result.error.message).toBe("No refresh token available");

    const state = store.getState();
    expect(axios.calls("post")).toHaveLength(0);
    expect(state.sublay.auth.initialized).toBe(true);
    expect(state.sublay.auth.accessToken).toBeNull();
    expect(state.sublay.accounts.activeAccountId).toBeNull();
    expect(state.sublay.accounts.signedOut).toBe(true);
    expect(state.sublay.accounts.accounts["user-1"]).toBeDefined();
    // An entry carrying no usable credential is exactly an entry that needs a
    // re-authentication — the same reading `activateStoredAccount` gives it.
    expect(state.sublay.accounts.accounts["user-1"].needsReauth).toBe(true);
  });

  it("an OFFLINE launch keeps the stored account selected and records no sign-out", async () => {
    // The failure this exists for: the init catch fired on ANY error and
    // persisted `signedOut: true`, so opening the app once with no connection
    // signed the user out — and the flag is what stops Phase A restoring the
    // account, so the next launch showed the picker too. A transport failure
    // says nothing about whether the credential is alive.
    const store = makeSublayStore();
    store.dispatch(setTokens({ accessToken: null, refreshToken: "refresh-1" }));
    store.dispatch(
      setAccountMap({
        activeAccountId: "user-1",
        accounts: {
          "user-1": {
            refreshToken: "refresh-1",
            tokenExpiresAt: 0,
            user: { id: "user-1", name: "A", email: null, avatar: null },
          },
        },
      }),
    );
    const axios = mockAxiosPublic();
    axios.mockNetworkError("post");

    const result = await store.dispatch(
      initializeAuthThunk({ projectId: "project-1" }),
    );

    // Still reported — the app can show "we could not reach the server".
    expect(initializeAuthThunk.rejected.match(result)).toBe(true);

    const state = store.getState();
    // The account is STILL SELECTED and nothing was recorded as deliberate.
    expect(state.sublay.accounts.activeAccountId).toBe("user-1");
    expect(state.sublay.accounts.signedOut).toBe(false);
    // The stored credential is untouched, so the next attempt has something to
    // present.
    expect(state.sublay.auth.refreshToken).toBe("refresh-1");
    expect(state.sublay.accounts.accounts["user-1"].refreshToken).toBe(
      "refresh-1",
    );
    // Nothing is marked: badging a healthy account as needing a re-sign-in
    // every time someone opens the app on a train is worse than the gap.
    expect(state.sublay.accounts.accounts["user-1"].needsReauth).toBeUndefined();
    // The gate still opens — withholding it parks every outbound request behind
    // the 5s ready-timeout fallback for the rest of the session.
    expect(state.sublay.auth.initialized).toBe(true);
  });
});

// ── The account cap (Phase 7) ────────────────────────────────────────────────
//
// Reaching MAX_ACCOUNTS used to be a SILENT no-op that corrupted the map:
// `upsertAccount` refused the entry and the sync effect selected the id anyway.
// Two gates now stand in front of it — a pre-flight on sign-up only, and an
// authoritative post-authentication check on all four entry points.

/** Five stored accounts — the map is full. */
function makeFullAccountMap(
  options: {
    activeAccountId?: string | null;
    emails?: Record<string, string | null>;
    ids?: string[];
  } = {},
) {
  const ids = options.ids ?? ["user-1", "user-2", "user-3", "user-4", "user-5"];
  const accounts = Object.fromEntries(
    ids.map((id) => [
      id,
      {
        refreshToken: `refresh-${id}`,
        tokenExpiresAt: 9999999999000,
        user: {
          id,
          name: id,
          email: options.emails?.[id] ?? `${id}@example.com`,
          avatar: null,
        },
      },
    ]),
  );
  return {
    activeAccountId:
      options.activeAccountId === undefined ? ids[0] : options.activeAccountId,
    accounts,
  };
}

describe("account cap — Gate 1 (pre-flight, sign-up only)", () => {
  it("rejects a sign-up at the limit without making any network call", async () => {
    const store = makeSublayStore();
    store.dispatch(setAccountMap(makeFullAccountMap()));
    const axios = mockAxiosPublic();

    const result = await store.dispatch(
      signUpWithEmailAndPasswordThunk({
        projectId: "project-1",
        email: "sixth@example.com",
        password: "secret",
      }),
    );

    expect(signUpWithEmailAndPasswordThunk.rejected.match(result)).toBe(true);
    if (!signUpWithEmailAndPasswordThunk.rejected.match(result)) {
      throw new Error("expected the sign-up to reject");
    }
    expect(result.payload).toBe(ACCOUNT_LIMIT_MESSAGE);

    // The whole point of Gate 1: no account is created on the server at all.
    expect(axios.calls("post")).toHaveLength(0);

    const state = store.getState();
    expect(state.sublay.accounts.accountLimitReached).toBe(true);
    expect(state.sublay.auth.isAuthenticating).toBe(false);
    expect(Object.keys(state.sublay.accounts.accounts)).toHaveLength(5);
  });

  it("does NOT pre-flight an email sign-in — a stored account signs back in at the limit", async () => {
    // A Gate-1 rejection is terminal (it happens before the network), so a
    // stale/absent/differently-cased stored email would lock a user out of
    // their own account. There is deliberately no pre-flight here.
    const store = makeSublayStore();
    store.dispatch(setAccountMap(makeFullAccountMap()));
    const axios = mockAxiosPublic();
    const user = { id: "user-3" } as AuthUser;
    axios.mockResponse("post", {
      accessToken: "access-3",
      refreshToken: "refresh-3-new",
      user,
    });

    const result = await store.dispatch(
      signInWithEmailAndPasswordThunk({
        projectId: "project-1",
        email: "user-3@example.com",
        password: "secret",
      }),
    );

    expect(signInWithEmailAndPasswordThunk.fulfilled.match(result)).toBe(true);
    expect(store.getState().sublay.auth.accessToken).toBe("access-3");
    expect(axios.calls("post").map((c) => c.url)).toEqual([
      "/project-1/auth/sign-in",
    ]);
  });

  it("signs a stored account with NO stored email back in at the limit", async () => {
    const store = makeSublayStore();
    store.dispatch(
      setAccountMap(makeFullAccountMap({ emails: { "user-3": null } })),
    );
    const axios = mockAxiosPublic();
    axios.mockResponse("post", {
      accessToken: "access-3",
      refreshToken: "refresh-3-new",
      user: { id: "user-3" } as AuthUser,
    });

    const result = await store.dispatch(
      signInWithEmailAndPasswordThunk({
        projectId: "project-1",
        email: "whatever@example.com",
        password: "secret",
      }),
    );

    expect(signInWithEmailAndPasswordThunk.fulfilled.match(result)).toBe(true);
    expect(store.getState().sublay.accounts.accountLimitReached).toBe(false);
    expect(axios.calls("post")).toHaveLength(1);
  });

  it("signs a stored account whose stored email differs in CASE back in at the limit", async () => {
    const store = makeSublayStore();
    store.dispatch(
      setAccountMap(
        makeFullAccountMap({ emails: { "user-3": "Alice@Example.COM" } }),
      ),
    );
    const axios = mockAxiosPublic();
    axios.mockResponse("post", {
      accessToken: "access-3",
      refreshToken: "refresh-3-new",
      user: { id: "user-3" } as AuthUser,
    });

    const result = await store.dispatch(
      signInWithEmailAndPasswordThunk({
        projectId: "project-1",
        email: "alice@example.com",
        password: "secret",
      }),
    );

    expect(signInWithEmailAndPasswordThunk.fulfilled.match(result)).toBe(true);
    expect(axios.calls("post")).toHaveLength(1);
  });
});

describe("account cap — Gate 2 (post-authentication, all four entry points)", () => {
  it("rejects an email sign-in for a NEW account, signs that session out, and leaves the active session untouched", async () => {
    const store = makeSublayStore();
    store.dispatch(setAccountMap(makeFullAccountMap()));
    // A live session for account A, the "direct sign-in while A is active" case.
    store.dispatch(
      setTokens({ accessToken: "access-a", refreshToken: "refresh-a" }),
    );
    store.dispatch(setUser({ id: "user-1" } as AuthUser));

    const axios = mockAxiosPublic();
    axios.mockResponse("post", {
      accessToken: "access-6",
      refreshToken: "minted-refresh-6",
      user: { id: "user-6" } as AuthUser,
    });
    axios.mockResponse("post", {}); // the cleanup sign-out

    const result = await store.dispatch(
      signInWithEmailAndPasswordThunk({
        projectId: "project-1",
        email: "sixth@example.com",
        password: "secret",
      }),
    );

    expect(signInWithEmailAndPasswordThunk.rejected.match(result)).toBe(true);
    if (!signInWithEmailAndPasswordThunk.rejected.match(result)) {
      throw new Error("expected the sign-in to reject");
    }
    expect(result.payload).toBe(ACCOUNT_LIMIT_MESSAGE);

    const calls = axios.calls("post");
    expect(calls.map((c) => c.url)).toEqual([
      "/project-1/auth/sign-in",
      "/project-1/auth/sign-out",
    ]);
    // NO ORPHANED SESSION: the just-minted credential — captured off the
    // response before anything could overwrite it — is what gets signed out.
    // And no `pushDevice`: an unbind failure would fail the whole sign-out and
    // leave the very session this call exists to destroy alive.
    expect(calls[1].body).toEqual({ refreshToken: "minted-refresh-6" });

    const state = store.getState();
    // Gate 2 ran BEFORE the token/user writes, so A's session is intact.
    expect(state.sublay.auth.accessToken).toBe("access-a");
    expect(state.sublay.auth.refreshToken).toBe("refresh-a");
    expect(state.sublay.auth.user).toEqual({ id: "user-1" });
    // The map never learns about user-6, and the active id stays a key of it.
    expect(state.sublay.accounts.accounts["user-6"]).toBeUndefined();
    expect(Object.keys(state.sublay.accounts.accounts)).toHaveLength(5);
    expect(state.sublay.accounts.activeAccountId).toBe("user-1");
    expect(
      state.sublay.accounts.accounts[
        state.sublay.accounts.activeAccountId as string
      ],
    ).toBeDefined();
    expect(state.sublay.accounts.accountLimitReached).toBe(true);
    expect(state.sublay.auth.isAuthenticating).toBe(false);
  });

  it("rejects a sign-up whose map filled while the request was in flight", async () => {
    // Gate 1 passed — there were four accounts when the call left. Gate 2 is
    // what catches the fifth arriving from another tab mid-flight.
    const store = makeSublayStore();
    store.dispatch(
      setAccountMap(
        makeFullAccountMap({ ids: ["user-1", "user-2", "user-3", "user-4"] }),
      ),
    );
    const axios = mockAxiosPublic();
    axios.mockResponse("post", {
      accessToken: "access-6",
      refreshToken: "minted-refresh-6",
      user: { id: "user-6" } as AuthUser,
    });
    axios.mockResponse("post", {}); // the cleanup sign-out

    // Started, then the fifth account lands while the request is in flight —
    // the thunk body is parked on the (already-queued) sign-up response, so
    // this dispatch happens strictly between Gate 1 and Gate 2.
    const pending = store.dispatch(
      signUpWithEmailAndPasswordThunk({
        projectId: "project-1",
        email: "sixth@example.com",
        password: "secret",
      }),
    );
    store.dispatch(setAccountMap(makeFullAccountMap()));
    const result = await pending;

    expect(signUpWithEmailAndPasswordThunk.rejected.match(result)).toBe(true);
    const calls = axios.calls("post");
    expect(calls.map((c) => c.url)).toEqual([
      "/project-1/auth/sign-up",
      "/project-1/auth/sign-out",
    ]);
    expect(calls[1].body).toEqual({ refreshToken: "minted-refresh-6" });
    expect(store.getState().sublay.auth.accessToken).toBeNull();
    expect(store.getState().sublay.accounts.accountLimitReached).toBe(true);
  });

  it("rejects an external-user verification for a NEW account and signs that session out", async () => {
    const store = makeSublayStore();
    store.dispatch(setAccountMap(makeFullAccountMap()));
    const axios = mockAxiosPublic();
    axios.mockResponse("post", {
      accessToken: "access-6",
      refreshToken: "minted-refresh-6",
      user: { id: "user-6" } as AuthUser,
    });
    axios.mockResponse("post", {});

    const result = await store.dispatch(
      verifyExternalUserThunk({ projectId: "project-1", userJwt: "jwt" }),
    );

    expect(verifyExternalUserThunk.rejected.match(result)).toBe(true);
    if (!verifyExternalUserThunk.rejected.match(result)) {
      throw new Error("expected the verification to reject");
    }
    expect(result.payload).toBe(ACCOUNT_LIMIT_MESSAGE);

    const calls = axios.calls("post");
    expect(calls.map((c) => c.url)).toEqual([
      "/project-1/auth/verify-external-user",
      "/project-1/auth/sign-out",
    ]);
    expect(calls[1].body).toEqual({ refreshToken: "minted-refresh-6" });

    const state = store.getState();
    expect(state.sublay.auth.accessToken).toBeNull();
    expect(state.sublay.auth.user).toBeNull();
    expect(state.sublay.accounts.accounts["user-6"]).toBeUndefined();
    expect(state.sublay.accounts.accountLimitReached).toBe(true);
  });

  it("verifies an already-stored external user at the limit", async () => {
    const store = makeSublayStore();
    store.dispatch(setAccountMap(makeFullAccountMap({ emails: { "user-2": null } })));
    const axios = mockAxiosPublic();
    axios.mockResponse("post", {
      accessToken: "access-2",
      refreshToken: "refresh-2-new",
      user: { id: "user-2" } as AuthUser,
    });

    const result = await store.dispatch(
      verifyExternalUserThunk({ projectId: "project-1", userJwt: "jwt" }),
    );

    expect(verifyExternalUserThunk.fulfilled.match(result)).toBe(true);
    expect(store.getState().sublay.auth.accessToken).toBe("access-2");
    expect(axios.calls("post")).toHaveLength(1);
  });

  it("catches an over-limit OAuth sign-in after the fact: unwinds to selection only, signs the ROTATED token out, and raises the flag", async () => {
    // `handleOAuthRedirect` already wrote the redirect's tokens synchronously,
    // before any identity existed — this is the one Gate-2 site that unwinds.
    const store = makeSublayStore();
    store.dispatch(setAccountMap(makeFullAccountMap({ activeAccountId: "user-1" })));
    store.dispatch(
      setTokens({ accessToken: "oauth-access", refreshToken: "oauth-refresh" }),
    );

    const axios = mockAxiosPublic();
    axios.mockResponse("post", {
      accessToken: "fresh",
      refreshToken: "rotated-refresh",
      user: { id: "user-6" } as AuthUser,
    });
    axios.mockResponse("post", {});

    const result = await store.dispatch(
      completeOAuthSignInThunk({ projectId: "project-1" }),
    );

    // It FULFILS: neither OAuth path can reject its caller — the entry point is
    // synchronous and shared by both platform packages. The flag is the channel.
    expect(completeOAuthSignInThunk.fulfilled.match(result)).toBe(true);

    const calls = axios.calls("post");
    expect(calls.map((c) => c.url)).toEqual([
      "/project-1/auth/request-new-access-token",
      "/project-1/auth/sign-out",
    ]);
    // The refresh ROTATED, so the redirect's original token is already spent —
    // signing out with it would leave the live family orphaned.
    expect(calls[1].body).toEqual({ refreshToken: "rotated-refresh" });

    const state = store.getState();
    expect(state.sublay.auth.accessToken).toBeNull();
    expect(state.sublay.auth.refreshToken).toBeNull();
    expect(state.sublay.auth.user).toBeNull();
    expect(selectUserSliceUser(state)).toBeNull();
    // Selection restored; the map still holds the active id.
    expect(state.sublay.accounts.activeAccountId).toBe("user-1");
    expect(state.sublay.accounts.accounts["user-1"]).toBeDefined();
    expect(state.sublay.accounts.accounts["user-6"]).toBeUndefined();
    expect(state.sublay.accounts.accountLimitReached).toBe(true);
  });

  it("leaves no selection — and does not fake a sign-out — when OAuth was started from addAccount()", async () => {
    const store = makeSublayStore();
    store.dispatch(
      setAccountMap(makeFullAccountMap({ activeAccountId: null })),
    );
    store.dispatch(
      setTokens({ accessToken: "oauth-access", refreshToken: "oauth-refresh" }),
    );
    const axios = mockAxiosPublic();
    axios.mockResponse("post", {
      accessToken: "fresh",
      refreshToken: "rotated-refresh",
      user: { id: "user-6" } as AuthUser,
    });
    axios.mockResponse("post", {});

    await store.dispatch(completeOAuthSignInThunk({ projectId: "project-1" }));

    const state = store.getState();
    expect(state.sublay.accounts.activeAccountId).toBeNull();
    // The user did not sign out — they failed to ADD. The next launch should
    // behave exactly as it would have before the attempt.
    expect(state.sublay.accounts.signedOut).toBe(false);
    expect(state.sublay.accounts.accountLimitReached).toBe(true);
  });

  it("lets an already-stored account back in through OAuth at the limit", async () => {
    const store = makeSublayStore();
    store.dispatch(setAccountMap(makeFullAccountMap({ activeAccountId: null })));
    store.dispatch(
      setTokens({ accessToken: "oauth-access", refreshToken: "oauth-refresh" }),
    );
    const axios = mockAxiosPublic();
    axios.mockResponse("post", {
      accessToken: "fresh",
      refreshToken: "rotated-refresh",
      user: { id: "user-4" } as AuthUser,
    });

    await store.dispatch(completeOAuthSignInThunk({ projectId: "project-1" }));

    expect(axios.calls("post").map((c) => c.url)).toEqual([
      "/project-1/auth/request-new-access-token",
    ]);
    expect(store.getState().sublay.auth.accessToken).toBe("fresh");
    expect(store.getState().sublay.accounts.accountLimitReached).toBe(false);
  });
});

describe("account cap — the launch-path collision (Task 7.2)", () => {
  it("surfaces a cap rejection at launch instead of swallowing it and restoring a stored account", async () => {
    // Integration mode: the app presents a signed token for a SIXTH user on
    // every launch. Gate 2 refuses it and signs the minted session out; without
    // this branch the thunk would fall through to step 2 and quietly restore
    // whichever stored account was selected — or, with none, land silently
    // signed-out on every single launch with no error and no route through.
    const store = makeSublayStore();
    store.dispatch(setAccountMap(makeFullAccountMap()));
    store.dispatch(setTokens({ accessToken: null, refreshToken: "refresh-1" }));
    const axios = mockAxiosPublic();
    axios.mockResponse("post", {
      accessToken: "access-6",
      refreshToken: "minted-refresh-6",
      user: { id: "user-6" } as AuthUser,
    });
    axios.mockResponse("post", {}); // the cleanup sign-out
    // Queued but must never be reached — reaching it would mean the launch
    // fell through and restored a stored account behind the user's back.
    axios.mockResponse("post", {
      accessToken: "from-refresh",
      refreshToken: "refresh-1-new",
      user: { id: "user-1" } as AuthUser,
    });

    const result = await store.dispatch(
      initializeAuthThunk({ projectId: "project-1", signedToken: "jwt" }),
    );

    expect(initializeAuthThunk.rejected.match(result)).toBe(true);
    if (!initializeAuthThunk.rejected.match(result)) {
      throw new Error("expected initializeAuthThunk to reject");
    }
    expect(result.error.message).toBe(ACCOUNT_LIMIT_MESSAGE);

    expect(axios.calls("post").map((c) => c.url)).toEqual([
      "/project-1/auth/verify-external-user",
      "/project-1/auth/sign-out",
    ]);

    const state = store.getState();
    // The auth gate still opens — withholding it would park every outbound
    // request behind the 5s ready-timeout fallback, silently.
    expect(state.sublay.auth.initialized).toBe(true);
    // Observably refused, with a readable reason.
    expect(state.sublay.accounts.accountLimitReached).toBe(true);
    // ...but NOT recorded as a sign-out, and the selection is left where it
    // was. Nobody signed out — an admission was refused — and persisting
    // `signedOut` is what stopped Phase A restoring a stored account, so every
    // subsequent launch reproduced this identical dead end.
    expect(state.sublay.accounts.signedOut).toBe(false);
    expect(state.sublay.accounts.activeAccountId).toBe("user-1");
    // The session still goes: the host believes a user we could not admit is
    // signed in, so acting as anybody else would be acting as the wrong person.
    expect(state.sublay.auth.accessToken).toBeNull();
    expect(state.sublay.auth.refreshToken).toBeNull();
    // Entries intact — nothing was lost, the user can free a slot.
    expect(Object.keys(state.sublay.accounts.accounts)).toHaveLength(5);
  });

  it("surfaces the cap on a RE-RUN, when the flag is already latched from an earlier refusal", async () => {
    // `SublayStoreProvider` re-dispatches this thunk on every `signedToken`
    // change with no `initialized` guard, and `accountLimitReached` is a sticky
    // latch — nothing ever sets it back to `false`. A "did the flag just flip?"
    // discriminator would therefore stop firing after the first refusal, and
    // the second launch would fall through to step 2 and silently restore the
    // previous account. The discriminator is the rejection payload instead.
    const store = makeSublayStore();
    store.dispatch(setAccountMap(makeFullAccountMap()));
    store.dispatch(setTokens({ accessToken: null, refreshToken: "refresh-1" }));
    // Already latched by an earlier refusal in this session.
    store.dispatch(setAccountLimitReached(true));

    const axios = mockAxiosPublic();
    axios.mockResponse("post", {
      accessToken: "access-6",
      refreshToken: "minted-refresh-6",
      user: { id: "user-6" } as AuthUser,
    });
    axios.mockResponse("post", {}); // the cleanup sign-out
    // Must never be reached.
    axios.mockResponse("post", {
      accessToken: "from-refresh",
      refreshToken: "refresh-1-new",
      user: { id: "user-1" } as AuthUser,
    });

    const result = await store.dispatch(
      initializeAuthThunk({ projectId: "project-1", signedToken: "rotated-jwt" }),
    );

    expect(initializeAuthThunk.rejected.match(result)).toBe(true);
    if (!initializeAuthThunk.rejected.match(result)) {
      throw new Error("expected initializeAuthThunk to reject");
    }
    expect(result.error.message).toBe(ACCOUNT_LIMIT_MESSAGE);

    expect(axios.calls("post").map((c) => c.url)).toEqual([
      "/project-1/auth/verify-external-user",
      "/project-1/auth/sign-out",
    ]);

    const state = store.getState();
    expect(state.sublay.auth.accessToken).toBeNull();
    expect(state.sublay.accounts.activeAccountId).toBe("user-1");
    expect(state.sublay.accounts.signedOut).toBe(false);
    expect(state.sublay.accounts.accountLimitReached).toBe(true);
    expect(state.sublay.auth.initialized).toBe(true);
  });

  it("still falls through to the stored-account refresh when the verify failed for any OTHER reason", async () => {
    const store = makeSublayStore();
    store.dispatch(setAccountMap(makeFullAccountMap()));
    store.dispatch(setTokens({ accessToken: null, refreshToken: "refresh-1" }));
    const axios = mockAxiosPublic();
    axios.mockError("post", 401, { error: "Invalid signed token" });
    axios.mockResponse("post", {
      accessToken: "from-refresh",
      refreshToken: "refresh-1-new",
      user: { id: "user-1" } as AuthUser,
    });

    await store.dispatch(
      initializeAuthThunk({ projectId: "project-1", signedToken: "jwt" }),
    );

    expect(store.getState().sublay.auth.accessToken).toBe("from-refresh");
    expect(store.getState().sublay.accounts.accountLimitReached).toBe(false);
    expect(axios.calls("post").map((c) => c.url)).toEqual([
      "/project-1/auth/verify-external-user",
      "/project-1/auth/request-new-access-token",
    ]);
  });
});
