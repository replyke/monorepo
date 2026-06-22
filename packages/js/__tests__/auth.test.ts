import { SublayHttpClient } from "../src/core/client";
import {
  changePassword,
  confirmAccountDeletion,
  requestAccountDeletion,
  requestNewAccessToken,
  requestPasswordReset,
  resetPassword,
  sendVerificationEmail,
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

  it("signOut resolves to undefined and clears the SDK's stored tokens", async () => {
    const { client, projectInstance } = makeRealClient({
      accessToken: "at1",
      refreshToken: "rt1",
    });
    projectInstance.post.mockResolvedValueOnce({ data: undefined });

    await expect(signOut(client)).resolves.toBeUndefined();
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

  it("changePassword returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const result = { success: true, message: "Password changed" };
    projectInstance.post.mockResolvedValueOnce({ data: result });
    await expect(
      changePassword(client, { password: "old-pw", newPassword: "new-pw" })
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
