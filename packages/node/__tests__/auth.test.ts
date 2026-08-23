import {
  changePassword,
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
import { makeClient } from "./helpers/mockClient";

describe("node-sdk auth — request shaping", () => {
  it("signUp posts the full body to /auth/sign-up", async () => {
    const { client, projectInstance } = makeClient();
    await signUp(client, { email: "a@b.com", password: "pw" });
    expect(projectInstance.post).toHaveBeenCalledWith("/auth/sign-up", {
      email: "a@b.com",
      password: "pw",
    });
  });

  it("signIn posts the full body to /auth/sign-in", async () => {
    const { client, projectInstance } = makeClient();
    await signIn(client, { email: "a@b.com", password: "pw" });
    expect(projectInstance.post).toHaveBeenCalledWith("/auth/sign-in", {
      email: "a@b.com",
      password: "pw",
    });
  });

  it("signOut posts the full body to /auth/sign-out", async () => {
    const { client, projectInstance } = makeClient();
    await signOut(client, { refreshToken: "rt1" });
    expect(projectInstance.post).toHaveBeenCalledWith("/auth/sign-out", {
      refreshToken: "rt1",
    });
  });

  it("signOut forwards the optional pushDevice identifier for atomic push deregistration", async () => {
    const { client, projectInstance } = makeClient();
    await signOut(client, {
      refreshToken: "rt1",
      pushDevice: { platform: "android", token: "device-token-1" },
    });
    expect(projectInstance.post).toHaveBeenCalledWith("/auth/sign-out", {
      refreshToken: "rt1",
      pushDevice: { platform: "android", token: "device-token-1" },
    });
  });

  it("signOut forwards a web pushDevice identifier as a subscription", async () => {
    const { client, projectInstance } = makeClient();
    const subscription = {
      endpoint: "https://push.example/abc",
      keys: { p256dh: "p", auth: "a" },
    };
    await signOut(client, {
      refreshToken: "rt1",
      pushDevice: { platform: "web", subscription },
    });
    expect(projectInstance.post).toHaveBeenCalledWith("/auth/sign-out", {
      refreshToken: "rt1",
      pushDevice: { platform: "web", subscription },
    });
  });

  it("requestNewAccessToken posts the full body to /auth/request-new-access-token", async () => {
    const { client, projectInstance } = makeClient();
    await requestNewAccessToken(client, { refreshToken: "rt1" });
    expect(projectInstance.post).toHaveBeenCalledWith(
      "/auth/request-new-access-token",
      { refreshToken: "rt1" },
    );
  });

  it("verifyExternalUser posts the full body to /auth/verify-external-user", async () => {
    const { client, projectInstance } = makeClient();
    await verifyExternalUser(client, { userJwt: "jwt1" });
    expect(projectInstance.post).toHaveBeenCalledWith(
      "/auth/verify-external-user",
      { userJwt: "jwt1" },
    );
  });

  it("requestPasswordReset posts the full body to /auth/request-password-reset", async () => {
    const { client, projectInstance } = makeClient();
    await requestPasswordReset(client, { email: "a@b.com" });
    expect(projectInstance.post).toHaveBeenCalledWith(
      "/auth/request-password-reset",
      { email: "a@b.com" },
    );
  });

  it("resetPassword posts the full body to /auth/reset-password", async () => {
    const { client, projectInstance } = makeClient();
    await resetPassword(client, { token: "tok1", newPassword: "new-pw" });
    expect(projectInstance.post).toHaveBeenCalledWith("/auth/reset-password", {
      token: "tok1",
      newPassword: "new-pw",
    });
  });

  it("changePassword posts the full body to /auth/change-password", async () => {
    const { client, projectInstance } = makeClient();
    await changePassword(client, { userId: "u1", password: "old-pw", newPassword: "new-pw" });
    expect(projectInstance.post).toHaveBeenCalledWith("/auth/change-password", {
      userId: "u1",
      password: "old-pw",
      newPassword: "new-pw",
    });
  });

  it("changePassword FORWARDS an optional pushDevice, naming the device to spare", async () => {
    // A password change deletes every push binding that user holds. A
    // service-key caller usually has no device to name and should omit this —
    // but when its own client told it which handset it is on, naming that
    // device keeps it receiving notifications while every other one goes quiet.
    const { client, projectInstance } = makeClient();
    await changePassword(client, {
      userId: "u1",
      password: "old-pw",
      newPassword: "new-pw",
      pushDevice: { platform: "ios", token: "device-of-the-handset-to-keep" },
    });
    expect(projectInstance.post).toHaveBeenCalledWith("/auth/change-password", {
      userId: "u1",
      password: "old-pw",
      newPassword: "new-pw",
      pushDevice: { platform: "ios", token: "device-of-the-handset-to-keep" },
    });
  });

  it("verifyEmail posts the full body to /auth/verify-email", async () => {
    const { client, projectInstance } = makeClient();
    await verifyEmail(client, { token: "tok1" });
    expect(projectInstance.post).toHaveBeenCalledWith("/auth/verify-email", {
      token: "tok1",
    });
  });

  it("sendVerificationEmail posts the full body to /auth/send-verification-email", async () => {
    const { client, projectInstance } = makeClient();
    await sendVerificationEmail(client, { userId: "u1", mode: "link" });
    expect(projectInstance.post).toHaveBeenCalledWith(
      "/auth/send-verification-email",
      { userId: "u1", mode: "link" },
    );
  });
});

describe("node-sdk auth — response mapping", () => {
  it("signUp returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const result = { user: { id: "u1" }, accessToken: "at1", refreshToken: "rt1" };
    projectInstance.post.mockResolvedValueOnce({ data: result });
    await expect(
      signUp(client, { email: "a@b.com", password: "pw" }),
    ).resolves.toEqual(result);
  });

  it("signIn returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const result = { user: { id: "u1" }, accessToken: "at1", refreshToken: "rt1" };
    projectInstance.post.mockResolvedValueOnce({ data: result });
    await expect(
      signIn(client, { email: "a@b.com", password: "pw" }),
    ).resolves.toEqual(result);
  });

  it("signOut resolves to undefined", async () => {
    const { client } = makeClient();
    await expect(signOut(client, { refreshToken: "rt1" })).resolves.toBeUndefined();
  });

  it("requestNewAccessToken returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const result = { accessToken: "at2" };
    projectInstance.post.mockResolvedValueOnce({ data: result });
    await expect(
      requestNewAccessToken(client, { refreshToken: "rt1" }),
    ).resolves.toEqual(result);
  });

  it("verifyExternalUser returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const result = { user: { id: "u1" }, accessToken: "at1", refreshToken: "rt1" };
    projectInstance.post.mockResolvedValueOnce({ data: result });
    await expect(
      verifyExternalUser(client, { userJwt: "jwt1" }),
    ).resolves.toEqual(result);
  });

  it("requestPasswordReset resolves to undefined", async () => {
    const { client } = makeClient();
    await expect(
      requestPasswordReset(client, { email: "a@b.com" }),
    ).resolves.toBeUndefined();
  });

  it("resetPassword resolves to undefined", async () => {
    const { client } = makeClient();
    await expect(
      resetPassword(client, { token: "tok1", newPassword: "new-pw" }),
    ).resolves.toBeUndefined();
  });

  it("changePassword returns response.data", async () => {
    const { client, projectInstance } = makeClient();
    const result = { success: true, message: "Password changed" };
    projectInstance.post.mockResolvedValueOnce({ data: result });
    await expect(
      changePassword(client, { userId: "u1", password: "old-pw", newPassword: "new-pw" }),
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
    await expect(
      sendVerificationEmail(client, { userId: "u1" }),
    ).resolves.toEqual(result);
  });
});
