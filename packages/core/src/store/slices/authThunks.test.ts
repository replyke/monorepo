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
} from "./authThunks";
import { setTokens, setUser } from "./authSlice";
import { setAccountMap } from "./accountsSlice";
import { selectUser as selectUserSliceUser } from "./userSlice";
import {
  armAuthGate,
  syncAuthGate,
  setAuthGateRefresher,
} from "../../config/authGate";
import type { AuthUser } from "../../interfaces/models/User";

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
  });
});
