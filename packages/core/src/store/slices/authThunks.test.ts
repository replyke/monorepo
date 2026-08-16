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

/** Minimal unsigned JWT — only `exp` is ever read. Negative = already expired. */
function jwtExpiringIn(seconds: number) {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  return `${encode({ alg: "HS256" })}.${encode({
    sub: "user-1",
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

  it("switches to the next account instead of a full reset when one remains", async () => {
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
    // sign-out call, then the requestNewAccessToken call for the next account
    axios.mockResponse("post", {});
    axios.mockResponse("post", {
      accessToken: "access-2",
      refreshToken: "refresh-2-rotated",
      user: { id: "user-2" },
    });

    const result = await store.dispatch(signOutThunk({ projectId: "project-1" }));

    expect(signOutThunk.fulfilled.match(result)).toBe(true);
    const state = store.getState();
    expect(state.sublay.auth.accessToken).toBe("access-2");
    expect(state.sublay.auth.refreshToken).toBe("refresh-2-rotated");
    expect(state.sublay.auth.initialized).toBe(true);

    const urls = axios.calls("post").map((c) => c.url);
    expect(urls).toEqual([
      "/project-1/auth/sign-out",
      "/project-1/auth/request-new-access-token",
    ]);
  });
});

describe("requestNewAccessTokenThunk", () => {
  it("is a no-op when there is no refresh token", async () => {
    const store = makeSublayStore();
    const axios = mockAxiosPublic();

    const result = await store.dispatch(requestNewAccessTokenThunk({ projectId: "project-1" }));

    expect(requestNewAccessTokenThunk.fulfilled.match(result)).toBe(true);
    expect(result.payload).toBeUndefined();
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
  it("throws a guard error when no user is authenticated", async () => {
    const store = makeSublayStore();

    const result = await store.dispatch(
      changePasswordThunk({ projectId: "project-1", password: "old", newPassword: "new" }),
    );

    expect(changePasswordThunk.rejected.match(result)).toBe(true);
    expect(result.error.message).toBe("No user is authenticated");
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
  it("throws a guard error when no user is authenticated", async () => {
    const store = makeSublayStore();

    const result = await store.dispatch(
      setPasswordThunk({ projectId: "project-1", newPassword: "new" }),
    );

    expect(setPasswordThunk.rejected.match(result)).toBe(true);
    expect(result.error.message).toBe("No user is authenticated");
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
  it("verifies the signed token then refreshes, finishing with initialized=true", async () => {
    const store = makeSublayStore();
    store.dispatch(setTokens({ accessToken: null, refreshToken: "refresh-1" }));
    const axios = mockAxiosPublic();
    const user = { id: "user-1" } as AuthUser;
    axios.mockResponse("post", { accessToken: "from-verify", refreshToken: "refresh-1", user });
    axios.mockResponse("post", { accessToken: "from-refresh", refreshToken: "refresh-2", user });

    await store.dispatch(initializeAuthThunk({ projectId: "project-1", signedToken: "jwt" }));

    const state = store.getState();
    expect(state.sublay.auth.initialized).toBe(true);
    expect(state.sublay.auth.accessToken).toBe("from-refresh");

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
});
