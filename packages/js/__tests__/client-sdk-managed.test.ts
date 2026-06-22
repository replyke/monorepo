import axios, { InternalAxiosRequestConfig } from "axios";
import { SublayHttpClient } from "../src/core/client";
import { okAxiosResponse, axiosErrorWithStatus, stubAdapter } from "./helpers/client";

interface RecordedCall {
  url?: string;
  retry: boolean;
  authHeader?: string;
}

/**
 * Any request not yet retried (no `_retry` flag) gets a 403; retries succeed.
 * Records a snapshot of each call at call-time (rather than relying on the
 * config object after the fact) — the retry interceptor mutates the SAME
 * config object in place, so inspecting `mock.calls` afterward would show
 * every call with its final, post-mutation state.
 */
function stubRefreshableAdapter(client: SublayHttpClient) {
  const calls: RecordedCall[] = [];
  const adapter = jest.fn(
    async (config: InternalAxiosRequestConfig & { _retry?: boolean }) => {
      calls.push({
        url: config.url,
        retry: !!config._retry,
        authHeader: config.headers.Authorization as string | undefined,
      });
      if (config._retry) return okAxiosResponse({ ok: true }, 200, config);
      throw axiosErrorWithStatus(403, undefined, config);
    }
  );
  stubAdapter(client.projectInstance, adapter);
  return calls;
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe("SublayHttpClient — SDK-managed mode (default, no getToken)", () => {
  it("attaches the in-memory access token from initialTokens when no Authorization header is set", async () => {
    const client = new SublayHttpClient({
      projectId: "proj1",
      initialTokens: { accessToken: "token-a", refreshToken: "refresh-a" },
    });
    const adapter = jest.fn(async (config: InternalAxiosRequestConfig) =>
      okAxiosResponse({ ok: true }, 200, config)
    );
    stubAdapter(client.projectInstance, adapter);

    await client.projectInstance.get("/x");

    expect(adapter.mock.calls[0][0].headers.Authorization).toBe("Bearer token-a");
  });

  it("leaves an explicit Authorization header untouched", async () => {
    const client = new SublayHttpClient({
      projectId: "proj1",
      initialTokens: { accessToken: "token-a", refreshToken: "refresh-a" },
    });
    const adapter = jest.fn(async (config: InternalAxiosRequestConfig) =>
      okAxiosResponse({ ok: true }, 200, config)
    );
    stubAdapter(client.projectInstance, adapter);

    await client.projectInstance.get("/x", {
      headers: { Authorization: "Bearer explicit" },
    });

    expect(adapter.mock.calls[0][0].headers.Authorization).toBe("Bearer explicit");
  });

  it("refreshes exactly once and retries with the new token when multiple requests 403 concurrently", async () => {
    const client = new SublayHttpClient({
      projectId: "proj1",
      initialTokens: { accessToken: "stale-token", refreshToken: "refresh-a" },
    });
    const calls = stubRefreshableAdapter(client);
    const refreshSpy = jest
      .spyOn(axios, "post")
      .mockResolvedValue({ data: { accessToken: "fresh-token" } });

    const [r1, r2] = await Promise.all([
      client.projectInstance.get("/a"),
      client.projectInstance.get("/b"),
    ]);

    expect(r1.data).toEqual({ ok: true });
    expect(r2.data).toEqual({ ok: true });
    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(refreshSpy).toHaveBeenCalledWith(
      "https://api.sublay.io/v7/proj1/auth/request-new-access-token",
      { refreshToken: "refresh-a" }
    );
    const retriedCalls = calls.filter((c) => c.retry);
    expect(retriedCalls).toHaveLength(2);
    for (const call of retriedCalls) {
      expect(call.authHeader).toBe("Bearer fresh-token");
    }
  });

  it("persists the rotated refresh token (not the original) and uses it on the next refresh", async () => {
    const onAuthChange = jest.fn();
    const client = new SublayHttpClient({
      projectId: "proj1",
      initialTokens: { accessToken: "stale-token", refreshToken: "refresh-a" },
      onAuthChange,
    });
    stubRefreshableAdapter(client);
    const refreshSpy = jest
      .spyOn(axios, "post")
      .mockResolvedValueOnce({
        data: { accessToken: "fresh-token-1", refreshToken: "refresh-b" },
      });

    await client.projectInstance.get("/a");

    expect(onAuthChange).toHaveBeenCalledWith({
      accessToken: "fresh-token-1",
      refreshToken: "refresh-b",
    });
    expect(client.getRefreshToken()).toBe("refresh-b");

    // Second refresh cycle must send the rotated token, not the original.
    stubRefreshableAdapter(client);
    refreshSpy.mockResolvedValueOnce({
      data: { accessToken: "fresh-token-2", refreshToken: "refresh-c" },
    });

    await client.projectInstance.get("/b");

    expect(refreshSpy).toHaveBeenLastCalledWith(
      "https://api.sublay.io/v7/proj1/auth/request-new-access-token",
      { refreshToken: "refresh-b" }
    );
  });

  it("falls back to setAccessToken (keeping the existing refresh token) when the server doesn't rotate it", async () => {
    const onAuthChange = jest.fn();
    const client = new SublayHttpClient({
      projectId: "proj1",
      initialTokens: { accessToken: "stale-token", refreshToken: "refresh-a" },
      onAuthChange,
    });
    stubRefreshableAdapter(client);
    jest.spyOn(axios, "post").mockResolvedValueOnce({
      data: { accessToken: "fresh-token" },
    });

    await client.projectInstance.get("/a");

    expect(client.getAccessToken()).toBe("fresh-token");
    expect(client.getRefreshToken()).toBe("refresh-a");
    expect(onAuthChange).toHaveBeenCalledWith({
      accessToken: "fresh-token",
      refreshToken: "refresh-a",
    });
  });

  it("rejects the original 403 when the refresh call fails", async () => {
    const client = new SublayHttpClient({
      projectId: "proj1",
      initialTokens: { accessToken: "stale-token", refreshToken: "refresh-a" },
    });
    stubRefreshableAdapter(client);
    jest.spyOn(axios, "post").mockRejectedValue(new Error("network fail"));

    await expect(client.projectInstance.get("/a")).rejects.toMatchObject({
      response: { status: 403 },
    });
  });

  it("rejects the original 403 without attempting a refresh when there is no refresh token", async () => {
    const client = new SublayHttpClient({ projectId: "proj1" });
    client.setAccessToken("stale-token");
    stubRefreshableAdapter(client);
    const refreshSpy = jest.spyOn(axios, "post");

    await expect(client.projectInstance.get("/a")).rejects.toMatchObject({
      response: { status: 403 },
    });
    expect(refreshSpy).not.toHaveBeenCalled();
  });

  describe("onAuthChange / setters", () => {
    it("fires onAuthChange with the full pair on setTokens", () => {
      const onAuthChange = jest.fn();
      const client = new SublayHttpClient({ projectId: "proj1", onAuthChange });

      client.setTokens({ accessToken: "a1", refreshToken: "r1" });

      expect(onAuthChange).toHaveBeenCalledWith({
        accessToken: "a1",
        refreshToken: "r1",
      });
      expect(client.getAccessToken()).toBe("a1");
      expect(client.getRefreshToken()).toBe("r1");
    });

    it("fires onAuthChange with null on clearTokens", () => {
      const onAuthChange = jest.fn();
      const client = new SublayHttpClient({
        projectId: "proj1",
        initialTokens: { accessToken: "a1", refreshToken: "r1" },
        onAuthChange,
      });

      client.clearTokens();

      expect(onAuthChange).toHaveBeenCalledWith(null);
      expect(client.getAccessToken()).toBeNull();
      expect(client.getRefreshToken()).toBeNull();
    });

    it("setAccessToken alone does not notify onAuthChange when there is no refresh token", () => {
      const onAuthChange = jest.fn();
      const client = new SublayHttpClient({ projectId: "proj1", onAuthChange });

      client.setAccessToken("a1");

      expect(onAuthChange).not.toHaveBeenCalled();
      expect(client.getAccessToken()).toBe("a1");
    });
  });
});
