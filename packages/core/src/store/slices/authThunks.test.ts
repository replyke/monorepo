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
import type { AuthUser } from "../../interfaces/models/User";

afterEach(() => {
  resetAxiosMocks();
});

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
