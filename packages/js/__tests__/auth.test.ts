import { SublayHttpClient } from "../src/core/client";
import {
  changePassword,
  confirmAccountDeletion,
  requestAccountDeletion,
  requestNewAccessToken,
  requestPasswordReset,
  resetPassword,
  sendVerificationEmail,
  setPassword,
  signIn,
  signOut,
  signUp,
  verifyEmail,
  verifyExternalUser,
} from "../src/modules/auth";
import { makeClient } from "./helpers/client";

/**
 * Builds a *real* `SublayHttpClient` (SDK-managed mode) so the token-storage
 * side effects (`setTokens`/`setAccessToken`/`clearTokens`/`getRefreshToken`)
 * are real, then swaps in a mocked `projectInstance` so no network call is
 * made. This is needed for auth functions specifically, since they read/write
 * the client's private in-memory token state — `makeClient()`'s plain mock
 * object has no such state.
 */
function makeRealClient(initialTokens?: { accessToken: string; refreshToken: string }) {
  const client = new SublayHttpClient({ projectId: "p1", initialTokens });
  const projectInstance = {
    get: jest.fn().mockResolvedValue({ data: {} }),
    post: jest.fn().mockResolvedValue({ data: {} }),
    patch: jest.fn().mockResolvedValue({ data: {} }),
    delete: jest.fn().mockResolvedValue({ data: {} }),
  };
  (client as unknown as { projectInstance: typeof projectInstance }).projectInstance =
    projectInstance as never;
  return { client, projectInstance };
}

/**
 * `jest.config.js` sets `clearMocks`, which only clears recorded CALLS — a spy's
 * replacement implementation survives it. Several sign-out tests silence
 * `console.warn` and the ones that assert nothing about it hold no handle to
 * restore, so without this the real `console.warn` stays replaced for every test
 * that runs after them in this file and an unexpected warning goes unseen.
 */
afterEach(() => {
  jest.restoreAllMocks();
});

describe("js-sdk auth — request shaping", () => {
  it("signUp posts the full body to /auth/sign-up", async () => {
    const { client, projectInstance } = makeRealClient();
    await signUp(client, { email: "a@b.com", password: "pw" });
    expect(projectInstance.post).toHaveBeenCalledWith("/auth/sign-up", {
      email: "a@b.com",
      password: "pw",
    });
  });

  it("signIn posts the full body to /auth/sign-in", async () => {
    const { client, projectInstance } = makeRealClient();
    await signIn(client, { email: "a@b.com", password: "pw" });
    expect(projectInstance.post).toHaveBeenCalledWith("/auth/sign-in", {
      email: "a@b.com",
      password: "pw",
    });
  });

  it("signOut posts the explicit refreshToken when provided", async () => {
    const { client, projectInstance } = makeRealClient();
    await signOut(client, { refreshToken: "rt-explicit" });
    expect(projectInstance.post).toHaveBeenCalledWith("/auth/sign-out", {
      refreshToken: "rt-explicit",
    });
  });

  it("signOut falls back to the SDK's stored refresh token when none is provided", async () => {
    const { client, projectInstance } = makeRealClient({
      accessToken: "at1",
      refreshToken: "rt-stored",
    });
    await signOut(client);
    expect(projectInstance.post).toHaveBeenCalledWith("/auth/sign-out", {
      refreshToken: "rt-stored",
    });
  });

  it("signOut posts an empty body when there is no stored or explicit refresh token", async () => {
    const { client, projectInstance } = makeRealClient();
    await signOut(client);
    expect(projectInstance.post).toHaveBeenCalledWith("/auth/sign-out", {});
  });

  it("signOut forwards the optional pushDevice identifier for atomic push deregistration", async () => {
    const { client, projectInstance } = makeRealClient();
    await signOut(client, {
      refreshToken: "rt-explicit",
      pushDevice: { platform: "ios", token: "device-token-1" },
    });
    expect(projectInstance.post).toHaveBeenCalledWith("/auth/sign-out", {
      refreshToken: "rt-explicit",
      pushDevice: { platform: "ios", token: "device-token-1" },
    });
  });

  it("signOut forwards a web pushDevice identifier as a subscription", async () => {
    const { client, projectInstance } = makeRealClient();
    const subscription = {
      endpoint: "https://push.example/abc",
      keys: { p256dh: "p", auth: "a" },
    };
    await signOut(client, {
      refreshToken: "rt-explicit",
      pushDevice: { platform: "web", subscription },
    });
    expect(projectInstance.post).toHaveBeenCalledWith("/auth/sign-out", {
      refreshToken: "rt-explicit",
      pushDevice: { platform: "web", subscription },
    });
  });

  // ── The unbind that cannot be scoped. ──────────────────────────
  //
  // `/auth/sign-out` answers 204 for a body with no `refreshToken` WITHOUT
  // reading `pushDevice` — the unbind is scoped to the token's `sub`, so with
  // no token there is nothing to scope it to. Sending it anyway would tell the
  // caller the binding was deleted when it was not; REFUSING the call would
  // leave the user unable to sign out at all, which is worse. So the field is
  // dropped, the sign-out completes, and the result says what was skipped.
  it("signOut still signs out when it cannot unbind, and reports the skip", async () => {
    const { client, projectInstance } = makeRealClient();
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});

    try {
      await expect(
        signOut(client, { pushDevice: { platform: "ios", token: "device-token-1" } })
      ).resolves.toEqual({
        pushUnbindSkipped: true,
        pushUnbindSkipReason: "no-refresh-token",
      });

      // Byte-identical to the same call with no `pushDevice` — one client state
      // cannot produce two different requests.
      expect(projectInstance.post).toHaveBeenCalledWith("/auth/sign-out", {});
      // ...and a caller that ignores the result still hears about it.
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toMatch(/SKIPPED/);
    } finally {
      warn.mockRestore();
    }
  });

  // The regression this replaces: the guard threw BEFORE the request and before
  // `clearTokens`. In SDK-managed mode the refresh token is memory-only, so
  // after any page reload there is none to resolve — and a caller that always
  // passes `pushDevice` could then never sign out. A user must always be able
  // to sign out.
  it("signOut clears the local tokens even when the unbind is skipped", async () => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
    const { client, projectInstance } = makeRealClient();
    client.setAccessToken("at1");
    // Precondition: a live access token, no refresh token — exactly the state a
    // reloaded SDK-managed page is in (the refresh token lives in memory only).
    expect(client.getAccessToken()).toBe("at1");
    expect(client.getRefreshToken()).toBeNull();

    await signOut(client, {
      pushDevice: { platform: "ios", token: "device-token-1" },
    });

    expect(projectInstance.post).toHaveBeenCalledWith("/auth/sign-out", {});
    expect(client.getAccessToken()).toBeNull();
    expect(client.getRefreshToken()).toBeNull();
  });

  // Host-managed mode is what makes the skip reachable rather than theoretical,
  // and it is exactly the mode the docblock points callers at. A host-managed
  // client is constructed with `getToken` and no `initialTokens` (the host owns
  // storage), and `setTokens` is a no-op in that mode — so it starts with no
  // refresh token and can never acquire one. Note the precise claim: the
  // constructor DOES honour `initialTokens` in host-managed mode, so "always
  // null" is a property of how these clients are built plus the setter being
  // inert, not of the getter.
  it("signOut in host-managed mode signs out and reports the skipped unbind", async () => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
    const client = new SublayHttpClient({
      projectId: "p1",
      getToken: async () => "access-token",
    });
    const projectInstance = { post: jest.fn().mockResolvedValue({ data: {} }) };
    (client as unknown as { projectInstance: typeof projectInstance }).projectInstance =
      projectInstance as never;

    // Precondition, in both directions: there is none, and storing one is inert.
    expect(client.getRefreshToken()).toBeNull();
    client.setTokens({ accessToken: "at1", refreshToken: "rt-stored" });
    expect(client.getRefreshToken()).toBeNull();

    await expect(
      signOut(client, { pushDevice: { platform: "ios", token: "device-token-1" } })
    ).resolves.toEqual({
      pushUnbindSkipped: true,
      pushUnbindSkipReason: "no-refresh-token",
    });
    expect(projectInstance.post).toHaveBeenCalledWith("/auth/sign-out", {});
  });

  it("signOut sends the pushDevice when the refresh token is passed explicitly", async () => {
    const { client, projectInstance } = makeRealClient();

    await expect(
      signOut(client, {
        refreshToken: "rt-explicit",
        pushDevice: { platform: "ios", token: "device-token-1" },
      })
    ).resolves.toEqual({ pushUnbindSkipped: false });

    expect(projectInstance.post).toHaveBeenCalledWith("/auth/sign-out", {
      refreshToken: "rt-explicit",
      pushDevice: { platform: "ios", token: "device-token-1" },
    });
  });

  // A sign-out that asked for no unbind has nothing at stake and must still
  // work with no credential at all. (The byte-identical no-credential request
  // itself is asserted by the empty-body test above.)
  it("signOut with no pushDevice still succeeds with no refresh token at all", async () => {
    const { client, projectInstance } = makeRealClient();

    await expect(signOut(client)).resolves.toEqual({ pushUnbindSkipped: false });

    expect(projectInstance.post).toHaveBeenCalledWith("/auth/sign-out", {});
  });

  // ── The skip the SERVER reports. ───────────────────────────────
  //
  // The unbind can also fail to happen with a refresh token in hand: the
  // server's push-availability lookup reads Redis and falls back to the
  // database, and when it cannot answer, the sign-out COMMITS and the unbind
  // is never attempted. It says so in a 200 body rather than failing the call
  // (the SDKs reject a sign-out on exactly two codes — the ones that PROVE an
  // unbind was attempted and rolled back — so a 5xx here has no good spelling:
  // reuse one of those and a cache blip locks the user inside the account,
  // carry any other code and the SDK signs out locally anyway and the skip goes
  // unreported) and rather than a bare 204 (which asserts there is nothing left
  // to remove). `pushUnbindSkipped`
  // has to cover it: this device may still be bound.
  it("signOut reports the server's skipped unbind on a 200", async () => {
    const { client, projectInstance } = makeRealClient();
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    projectInstance.post.mockResolvedValueOnce({
      status: 200,
      data: {
        pushUnbindSkipped: true,
        code: "auth/push-unbind-status-unknown",
        message:
          "Signed out. Whether this project has push devices could not be determined, so no unbind was attempted and this device may still be bound to that account.",
      },
    });

    try {
      await expect(
        signOut(client, {
          refreshToken: "rt-explicit",
          pushDevice: { platform: "ios", token: "device-token-1" },
        })
      ).resolves.toEqual({
        pushUnbindSkipped: true,
        pushUnbindSkipReason: "push-unbind-status-unknown",
      });

      // The request was made in full — this skip is the server's, not ours.
      expect(projectInstance.post).toHaveBeenCalledWith("/auth/sign-out", {
        refreshToken: "rt-explicit",
        pushDevice: { platform: "ios", token: "device-token-1" },
      });
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toMatch(/SKIPPED/);
    } finally {
      warn.mockRestore();
    }
  });

  // Signing out always completes locally, whichever side skipped the unbind.
  it("signOut clears the local tokens when the server reports a skipped unbind", async () => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
    const { client, projectInstance } = makeRealClient({
      accessToken: "at1",
      refreshToken: "rt-stored",
    });
    projectInstance.post.mockResolvedValueOnce({
      status: 200,
      data: { pushUnbindSkipped: true, code: "auth/push-unbind-status-unknown" },
    });

    await signOut(client, {
      pushDevice: { platform: "ios", token: "device-token-1" },
    });

    expect(client.getAccessToken()).toBeNull();
    expect(client.getRefreshToken()).toBeNull();
  });

  // Read POSITIVELY, off the code. A 204 carries no body and an ordinary 200
  // carries no code; neither may be asked to prove a negative, and no other
  // code may be mistaken for this one.
  it.each([
    ["a 204 with no body", { status: 204, data: "" }],
    ["a 200 with an unrelated code", { status: 200, data: { code: "auth/whatever" } }],
    ["a body-less response object", { status: 204 }],
  ])(
    "signOut does not report a skipped unbind for %s",
    async (_label, response) => {
      const { client, projectInstance } = makeRealClient();
      const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
      projectInstance.post.mockResolvedValueOnce(response);

      try {
        await expect(
          signOut(client, {
            refreshToken: "rt-explicit",
            pushDevice: { platform: "ios", token: "device-token-1" },
          })
        ).resolves.toEqual({ pushUnbindSkipped: false });
        expect(warn).not.toHaveBeenCalled();
      } finally {
        warn.mockRestore();
      }
    }
  );

  // ── The strictness is SCOPED TO UNBIND FAILURES. ─────────────────────────
  //
  // A user must ALWAYS be able to sign out, so a failed sign-out tears down
  // locally and resolves. The one exemption is the server's own statement that
  // it attempted the atomic unbind and committed nothing: there the token
  // family and the binding are both still alive, and clearing the tokens would
  // delete the only credential that could retry the unbind — leaving the user
  // receiving notifications from an account they can no longer reach. Mirrors
  // `isUnbindFailure` + the sign-out thunk in `@sublay/core`.
  it.each([
    ["the PushDevices destroy threw", "auth/device-deregistration-failed"],
    ["the rollback took the unbind with it", "auth/sign-out-failed"],
  ])(
    "signOut rethrows the unbind failure and keeps the local tokens when %s",
    async (_label, code) => {
      const { client, projectInstance } = makeRealClient({
        accessToken: "at1",
        refreshToken: "rt-stored",
      });
      const rejection = { response: { status: 500, data: { code } } };
      projectInstance.post.mockRejectedValueOnce(rejection);

      await expect(
        signOut(client, {
          pushDevice: { platform: "ios", token: "device-token-1" },
        })
      ).rejects.toBe(rejection);

      // The credential the retry needs survives — on both sides.
      expect(client.getAccessToken()).toBe("at1");
      expect(client.getRefreshToken()).toBe("rt-stored");
    }
  );

  // Everything else. None of these touched a push binding: the gates reject
  // before the sign-out controller runs, `auth/server-error` is the generic
  // outer catch, and a dropped connection carries no response at all. Blocking
  // on any of them is what made this call unusable offline.
  it.each([
    ["a rate-limited or quota-gated 429", { response: { status: 429, data: { code: "quota/exceeded" } } }],
    ["a 423 for a pending deletion", { response: { status: 423, data: { code: "user/pending-deletion" } } }],
    ["a 503 during a migration", { response: { status: 503, data: { code: "project/migrating" } } }],
    ["a 400 on a malformed body", { response: { status: 400, data: { error: "Invalid request body" } } }],
    ["the generic server error", { response: { status: 500, data: { code: "auth/server-error" } } }],
    // No `response` at all, and a top-level `code` that must not be mistaken
    // for the response code the block keys on.
    ["a dropped connection", Object.assign(new Error("Network Error"), { code: "auth/sign-out-failed" })],
  ])(
    "signOut clears the local tokens and resolves on %s",
    async (_label, rejection) => {
      const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
      const { client, projectInstance } = makeRealClient({
        accessToken: "at1",
        refreshToken: "rt-stored",
      });
      projectInstance.post.mockRejectedValueOnce(rejection);

      try {
        await expect(signOut(client)).resolves.toEqual({
          pushUnbindSkipped: false,
        });
        expect(client.getAccessToken()).toBeNull();
        expect(client.getRefreshToken()).toBeNull();
        // Swallowed, not silent.
        expect(warn).toHaveBeenCalledTimes(1);
      } finally {
        warn.mockRestore();
      }
    }
  );

  // The block is keyed on the server's CODE, never on "did I ask for an
  // unbind". Sending a `pushDevice` says the client asked, not that the server
  // attempted — so a gate rejection must still sign the user out, otherwise one
  // project over its quota locks its whole push-enabled population in.
  it("signOut resolves on a gate rejection even when a pushDevice was sent", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const { client, projectInstance } = makeRealClient({
      accessToken: "at1",
      refreshToken: "rt-stored",
    });
    projectInstance.post.mockRejectedValueOnce({
      response: { status: 429, data: { code: "quota/exceeded" } },
    });

    try {
      await expect(
        signOut(client, {
          pushDevice: { platform: "ios", token: "device-token-1" },
        })
      ).resolves.toEqual({ pushUnbindSkipped: false });
      expect(client.getAccessToken()).toBeNull();
      expect(client.getRefreshToken()).toBeNull();
    } finally {
      warn.mockRestore();
    }
  });

  it("requestNewAccessToken posts the explicit refreshToken when provided", async () => {
    const { client, projectInstance } = makeRealClient();
    await requestNewAccessToken(client, { refreshToken: "rt-explicit" });
    expect(projectInstance.post).toHaveBeenCalledWith(
      "/auth/request-new-access-token",
      { refreshToken: "rt-explicit" }
    );
  });

  it("requestNewAccessToken falls back to the SDK's stored refresh token when none is provided", async () => {
    const { client, projectInstance } = makeRealClient({
      accessToken: "at1",
      refreshToken: "rt-stored",
    });
    await requestNewAccessToken(client);
    expect(projectInstance.post).toHaveBeenCalledWith(
      "/auth/request-new-access-token",
      { refreshToken: "rt-stored" }
    );
  });

  it("requestNewAccessToken throws when there is no refresh token available", async () => {
    const { client } = makeRealClient();
    await expect(requestNewAccessToken(client)).rejects.toThrow(
      "requestNewAccessToken: no refresh token available (none stored and none provided)."
    );
  });

  it("verifyExternalUser posts the full body to /auth/verify-external-user", async () => {
    const { client, projectInstance } = makeRealClient();
    await verifyExternalUser(client, { userJwt: "jwt1" });
    expect(projectInstance.post).toHaveBeenCalledWith(
      "/auth/verify-external-user",
      { userJwt: "jwt1" }
    );
  });

  it("requestPasswordReset posts the full body to /auth/request-password-reset (no implicit actor)", async () => {
    const { client, projectInstance } = makeClient();
    await requestPasswordReset(client, { email: "a@b.com" });
    expect(projectInstance.post).toHaveBeenCalledWith(
      "/auth/request-password-reset",
      { email: "a@b.com" }
    );
  });

  it("resetPassword posts the full body to /auth/reset-password (no implicit actor)", async () => {
    const { client, projectInstance } = makeClient();
    await resetPassword(client, { token: "tok1", newPassword: "new-pw" });
    expect(projectInstance.post).toHaveBeenCalledWith("/auth/reset-password", {
      token: "tok1",
      newPassword: "new-pw",
    });
  });

  it("changePassword posts password/newPassword with no userId (actor derived from token)", async () => {
    const { client, projectInstance } = makeClient();
    await changePassword(client, { password: "old-pw", newPassword: "new-pw" });
    expect(projectInstance.post).toHaveBeenCalledWith(
      "/auth/change-password",
      { password: "old-pw", newPassword: "new-pw" }
    );
    const [, body] = projectInstance.post.mock.calls[0];
    expect(body).not.toHaveProperty("userId");
  });

  it("changePassword sends NO session credential, even when one is stored", async () => {
    // The server identifies the caller's session from the `sid` claim on the
    // access token the request already carries, so nothing about the session is
    // sent. This asserts the negative deliberately: the field this call used to
    // put in the body was a 30-day refresh token on a route that authenticates
    // with a 30-minute one and never needed it.
    const { client, projectInstance } = makeRealClient({
      accessToken: "at1",
      refreshToken: "rt1",
    });

    await changePassword(client, { password: "old-pw", newPassword: "new-pw" });

    expect(projectInstance.post).toHaveBeenCalledWith("/auth/change-password", {
      password: "old-pw",
      newPassword: "new-pw",
    });
    const [, body] = projectInstance.post.mock.calls[0];
    expect(body).not.toHaveProperty("refreshToken");
    expect(JSON.stringify(body)).not.toContain("rt1");
  });

  it("changePassword forwards pushDevice so this device keeps its push binding", async () => {
    const { client, projectInstance } = makeRealClient({
      accessToken: "at1",
      refreshToken: "rt1",
    });

    await changePassword(client, {
      password: "old-pw",
      newPassword: "new-pw",
      pushDevice: { platform: "ios", token: "device-token-1" },
    });

    expect(projectInstance.post).toHaveBeenCalledWith("/auth/change-password", {
      password: "old-pw",
      newPassword: "new-pw",
      pushDevice: { platform: "ios", token: "device-token-1" },
    });
  });

  it("setPassword posts newPassword with no userId (actor derived from token)", async () => {
    const { client, projectInstance } = makeClient();
    await setPassword(client, { newPassword: "new-pw" });
    expect(projectInstance.post).toHaveBeenCalledWith("/auth/set-password", {
      newPassword: "new-pw",
    });
    const [, body] = projectInstance.post.mock.calls[0];
    expect(body).not.toHaveProperty("userId");
  });

  it("verifyEmail posts the full body to /auth/verify-email (no implicit actor)", async () => {
    const { client, projectInstance } = makeClient();
    await verifyEmail(client, { token: "tok1" });
    expect(projectInstance.post).toHaveBeenCalledWith("/auth/verify-email", {
      token: "tok1",
    });
  });

  it("sendVerificationEmail posts the full body with no userId (actor derived from token)", async () => {
    const { client, projectInstance } = makeClient();
    await sendVerificationEmail(client, { mode: "link" });
    expect(projectInstance.post).toHaveBeenCalledWith(
      "/auth/send-verification-email",
      { mode: "link" }
    );
    const [, body] = projectInstance.post.mock.calls[0];
    expect(body).not.toHaveProperty("userId");
  });

  it("sendVerificationEmail posts an empty body when called with no args", async () => {
    const { client, projectInstance } = makeClient();
    await sendVerificationEmail(client);
    expect(projectInstance.post).toHaveBeenCalledWith(
      "/auth/send-verification-email",
      {}
    );
  });

  it("requestAccountDeletion posts an empty body with no implicit actor (the signed-in user is implicit)", async () => {
    const { client, projectInstance } = makeClient();
    await requestAccountDeletion(client);
    expect(projectInstance.post).toHaveBeenCalledWith(
      "/auth/request-account-deletion",
      {}
    );
  });

  it("confirmAccountDeletion posts only the code with no userId (actor derived from token)", async () => {
    const { client, projectInstance } = makeClient();
    await confirmAccountDeletion(client, { code: "123456" });
    expect(projectInstance.post).toHaveBeenCalledWith(
      "/auth/confirm-account-deletion",
      { code: "123456" }
    );
    const [, body] = projectInstance.post.mock.calls[0];
    expect(body).not.toHaveProperty("userId");
  });
});

describe("js-sdk auth — response mapping", () => {
  it("signUp returns response.data and stores the returned tokens", async () => {
    const { client, projectInstance } = makeRealClient();
    const result = {
      user: { id: "u1" },
      accessToken: "at1",
      refreshToken: "rt1",
    };
    projectInstance.post.mockResolvedValueOnce({ data: result });

    await expect(
      signUp(client, { email: "a@b.com", password: "pw" })
    ).resolves.toEqual(result);
    expect(client.getAccessToken()).toBe("at1");
    expect(client.getRefreshToken()).toBe("rt1");
  });

  it("signIn returns response.data and stores the returned tokens", async () => {
    const { client, projectInstance } = makeRealClient();
    const result = {
      user: { id: "u1" },
      accessToken: "at1",
      refreshToken: "rt1",
    };
    projectInstance.post.mockResolvedValueOnce({ data: result });

    await expect(
      signIn(client, { email: "a@b.com", password: "pw" })
    ).resolves.toEqual(result);
    expect(client.getAccessToken()).toBe("at1");
    expect(client.getRefreshToken()).toBe("rt1");
  });

  it("signOut reports no skipped unbind and clears the SDK's stored tokens", async () => {
    const { client, projectInstance } = makeRealClient({
      accessToken: "at1",
      refreshToken: "rt1",
    });
    projectInstance.post.mockResolvedValueOnce({ data: undefined });

    await expect(signOut(client)).resolves.toEqual({ pushUnbindSkipped: false });
    expect(client.getAccessToken()).toBeNull();
    expect(client.getRefreshToken()).toBeNull();
  });

  it("requestNewAccessToken returns response.data and persists the rotated refresh token", async () => {
    const { client, projectInstance } = makeRealClient({
      accessToken: "at-old",
      refreshToken: "rt-old",
    });
    const result = { accessToken: "at-new", refreshToken: "rt-new" };
    projectInstance.post.mockResolvedValueOnce({ data: result });

    await expect(requestNewAccessToken(client)).resolves.toEqual(result);
    expect(client.getAccessToken()).toBe("at-new");
    expect(client.getRefreshToken()).toBe("rt-new");
  });

  it("requestNewAccessToken updates only the access token when no rotated refresh token is returned", async () => {
    const { client, projectInstance } = makeRealClient({
      accessToken: "at-old",
      refreshToken: "rt-old",
    });
    const result = { accessToken: "at-new" };
    projectInstance.post.mockResolvedValueOnce({ data: result });

    await expect(requestNewAccessToken(client)).resolves.toEqual(result);
    expect(client.getAccessToken()).toBe("at-new");
    expect(client.getRefreshToken()).toBe("rt-old");
  });

  it("verifyExternalUser returns response.data and stores the returned tokens", async () => {
    const { client, projectInstance } = makeRealClient();
    const result = {
      user: { id: "u1" },
      accessToken: "at1",
      refreshToken: "rt1",
    };
    projectInstance.post.mockResolvedValueOnce({ data: result });

    await expect(
      verifyExternalUser(client, { userJwt: "jwt1" })
    ).resolves.toEqual(result);
    expect(client.getAccessToken()).toBe("at1");
    expect(client.getRefreshToken()).toBe("rt1");
  });

  it("requestPasswordReset resolves to undefined", async () => {
    const { client } = makeClient();
    await expect(
      requestPasswordReset(client, { email: "a@b.com" })
    ).resolves.toBeUndefined();
  });

  it("resetPassword resolves to undefined", async () => {
    const { client } = makeClient();
    await expect(
      resetPassword(client, { token: "tok1", newPassword: "new-pw" })
    ).resolves.toBeUndefined();
  });

  it("changePassword returns response.data and sends no session credential", async () => {
    // A real client, holding real tokens: the point is that none of them reach
    // the request. The server identifies the session to spare from a claim on
    // the access token the call already carries, so the body names no session
    // and no refresh token travels to this endpoint.
    const { client, projectInstance } = makeRealClient();
    const result = { success: true, message: "Password changed" };
    projectInstance.post.mockResolvedValueOnce({ data: result });

    await expect(
      changePassword(client, { password: "old-pw", newPassword: "new-pw" })
    ).resolves.toEqual(result);

    const [, body] = projectInstance.post.mock.calls[0];
    expect(body).toEqual({ password: "old-pw", newPassword: "new-pw" });
    expect(body).not.toHaveProperty("refreshToken");
  });

  it("setPassword returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const result = { success: true, message: "Password set successfully." };
    projectInstance.post.mockResolvedValueOnce({ data: result });
    await expect(
      setPassword(client, { newPassword: "new-pw" })
    ).resolves.toEqual(result);
  });

  it("verifyEmail resolves to undefined", async () => {
    const { client } = makeClient();
    await expect(verifyEmail(client, { token: "tok1" })).resolves.toBeUndefined();
  });

  it("sendVerificationEmail returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const result = { success: true };
    projectInstance.post.mockResolvedValueOnce({ data: result });
    await expect(sendVerificationEmail(client)).resolves.toEqual(result);
  });

  it("requestAccountDeletion returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const result = { success: true };
    projectInstance.post.mockResolvedValueOnce({ data: result });
    await expect(requestAccountDeletion(client)).resolves.toEqual(result);
  });

  it("confirmAccountDeletion resolves to undefined", async () => {
    const { client } = makeClient();
    await expect(
      confirmAccountDeletion(client, { code: "123456" })
    ).resolves.toBeUndefined();
  });
});
