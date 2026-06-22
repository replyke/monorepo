import {
  authorize,
  linkIdentity,
  listIdentities,
  unlinkIdentity,
} from "../src/modules/oauth";
import { makeClient } from "./helpers/client";

describe("js-sdk oauth — request shaping", () => {
  it("authorize posts provider + redirectAfterAuth to /oauth/authorize", async () => {
    const { client, projectInstance } = makeClient();
    await authorize(client, {
      provider: "google",
      redirectAfterAuth: "https://app.example.com/callback",
    });
    expect(projectInstance.post).toHaveBeenCalledWith("/oauth/authorize", {
      provider: "google",
      redirectAfterAuth: "https://app.example.com/callback",
    });
  });

  it("linkIdentity posts provider + redirectAfterAuth to /oauth/link (current user from token)", async () => {
    const { client, projectInstance } = makeClient();
    await linkIdentity(client, {
      provider: "github",
      redirectAfterAuth: "https://app.example.com/settings",
    });
    expect(projectInstance.post).toHaveBeenCalledWith("/oauth/link", {
      provider: "github",
      redirectAfterAuth: "https://app.example.com/settings",
    });
  });

  it("listIdentities hits GET /oauth/identities with no params", async () => {
    const { client, projectInstance } = makeClient();
    await listIdentities(client);
    expect(projectInstance.get).toHaveBeenCalledWith("/oauth/identities");
  });

  it("unlinkIdentity hits DELETE /oauth/identities/:identityId", async () => {
    const { client, projectInstance } = makeClient();
    await unlinkIdentity(client, { identityId: "ident1" });
    expect(projectInstance.delete).toHaveBeenCalledWith(
      "/oauth/identities/ident1"
    );
  });
});

describe("js-sdk oauth — response mapping", () => {
  it("authorize returns the redirect-flow authorizationUrl, not an actual redirect", async () => {
    const { client, projectInstance } = makeClient();
    const result = { authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth?..." };
    projectInstance.post.mockResolvedValueOnce({ data: result });

    const response = await authorize(client, {
      provider: "google",
      redirectAfterAuth: "https://app.example.com/callback",
    });

    expect(response).toEqual(result);
  });

  it("linkIdentity returns the redirect-flow authorizationUrl, not an actual redirect", async () => {
    const { client, projectInstance } = makeClient();
    const result = { authorizationUrl: "https://github.com/login/oauth/authorize?..." };
    projectInstance.post.mockResolvedValueOnce({ data: result });

    const response = await linkIdentity(client, {
      provider: "github",
      redirectAfterAuth: "https://app.example.com/settings",
    });

    expect(response).toEqual(result);
  });

  it("listIdentities returns the identities list as-is", async () => {
    const { client, projectInstance } = makeClient();
    const result = {
      identities: [
        {
          id: "ident1",
          provider: "google",
          providerAccountId: "1234567890",
          email: "user@example.com",
          name: "Jane Doe",
          avatar: null,
          isVerified: true,
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    };
    projectInstance.get.mockResolvedValueOnce({ data: result });

    const response = await listIdentities(client);

    expect(response).toEqual(result);
  });

  it("unlinkIdentity returns the success result as-is", async () => {
    const { client, projectInstance } = makeClient();
    const result = { success: true };
    projectInstance.delete.mockResolvedValueOnce({ data: result });

    const response = await unlinkIdentity(client, { identityId: "ident1" });

    expect(response).toEqual(result);
  });
});
