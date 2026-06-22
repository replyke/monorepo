import axios, { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { SublayHttpClient } from "../src/core/client";
import { okAxiosResponse, axiosErrorWithStatus, stubAdapter } from "./helpers/client";

afterEach(() => {
  jest.restoreAllMocks();
});

interface RecordedCall {
  url?: string;
  retry: boolean;
  authHeader?: string;
}

/**
 * Records a snapshot of each call at call-time — the retry interceptor
 * mutates the same config object in place, so inspecting `mock.calls`
 * afterward would show every call with its final, post-mutation state.
 */
function stubRecordingAdapter(
  client: SublayHttpClient,
  respond: (
    config: InternalAxiosRequestConfig & { _retry?: boolean }
  ) => Promise<AxiosResponse> | AxiosResponse
) {
  const calls: RecordedCall[] = [];
  const adapter = jest.fn(
    async (config: InternalAxiosRequestConfig & { _retry?: boolean }) => {
      calls.push({
        url: config.url,
        retry: !!config._retry,
        authHeader: config.headers.Authorization as string | undefined,
      });
      return respond(config);
    }
  );
  stubAdapter(client.projectInstance, adapter);
  return calls;
}

describe("SublayHttpClient — host-managed mode (getToken provided)", () => {
  it("reads the current token from getToken() on every request", async () => {
    const getToken = jest
      .fn()
      .mockResolvedValueOnce("token-1")
      .mockResolvedValueOnce("token-2");
    const client = new SublayHttpClient({ projectId: "proj1", getToken });
    const calls = stubRecordingAdapter(client, (config) =>
      okAxiosResponse({ ok: true }, 200, config)
    );

    await client.projectInstance.get("/a");
    await client.projectInstance.get("/b");

    expect(getToken).toHaveBeenCalledTimes(2);
    expect(calls[0].authHeader).toBe("Bearer token-1");
    expect(calls[1].authHeader).toBe("Bearer token-2");
  });

  it("leaves an explicit Authorization header untouched, without calling getToken", async () => {
    const getToken = jest.fn().mockResolvedValue("token-1");
    const client = new SublayHttpClient({ projectId: "proj1", getToken });
    stubRecordingAdapter(client, (config) => okAxiosResponse({ ok: true }, 200, config));

    await client.projectInstance.get("/x", {
      headers: { Authorization: "Bearer explicit" },
    });

    expect(getToken).not.toHaveBeenCalled();
  });

  it("re-reads getToken once on a 403 and retries with the rotated token", async () => {
    const getToken = jest
      .fn()
      .mockResolvedValueOnce("stale-token")
      .mockResolvedValueOnce("rotated-token");
    const client = new SublayHttpClient({ projectId: "proj1", getToken });
    const refreshSpy = jest.spyOn(axios, "post");
    const calls = stubRecordingAdapter(
      client,
      (config: InternalAxiosRequestConfig & { _retry?: boolean }) => {
        if (config._retry) return okAxiosResponse({ ok: true }, 200, config);
        throw axiosErrorWithStatus(403, undefined, config);
      }
    );

    const res = await client.projectInstance.get("/a");

    expect(res.data).toEqual({ ok: true });
    expect(getToken).toHaveBeenCalledTimes(2);
    expect(calls).toHaveLength(2);
    expect(calls[0]).toMatchObject({ retry: false, authHeader: "Bearer stale-token" });
    expect(calls[1]).toMatchObject({ retry: true, authHeader: "Bearer rotated-token" });
    // Host-managed mode re-reads getToken(); it must never hit the SDK's own
    // refresh endpoint, which only exists for SDK-managed mode.
    expect(refreshSpy).not.toHaveBeenCalled();
  });

  it("rejects the original 403 when getToken() returns the same (unrotated) token on retry", async () => {
    const getToken = jest.fn().mockResolvedValue("same-token");
    const client = new SublayHttpClient({ projectId: "proj1", getToken });
    stubRecordingAdapter(
      client,
      (config: InternalAxiosRequestConfig & { _retry?: boolean }) => {
        if (config._retry) return okAxiosResponse({ ok: true }, 200, config);
        throw axiosErrorWithStatus(403, undefined, config);
      }
    );

    await expect(client.projectInstance.get("/a")).rejects.toMatchObject({
      response: { status: 403 },
    });
    expect(getToken).toHaveBeenCalledTimes(2);
  });

  it("rejects the original 403 without retrying when getToken() returns nothing on re-read", async () => {
    const getToken = jest
      .fn()
      .mockResolvedValueOnce("stale-token")
      .mockResolvedValueOnce(null);
    const client = new SublayHttpClient({ projectId: "proj1", getToken });
    stubRecordingAdapter(
      client,
      (config: InternalAxiosRequestConfig & { _retry?: boolean }) => {
        if (config._retry) return okAxiosResponse({ ok: true }, 200, config);
        throw axiosErrorWithStatus(403, undefined, config);
      }
    );

    await expect(client.projectInstance.get("/a")).rejects.toMatchObject({
      response: { status: 403 },
    });
  });

  describe("setTokens / setAccessToken / clearTokens are no-ops", () => {
    it("setTokens does not change what getAccessToken/getRefreshToken report and does not fire onAuthChange", () => {
      const onAuthChange = jest.fn();
      const getToken = jest.fn().mockResolvedValue("token-1");
      const client = new SublayHttpClient({ projectId: "proj1", getToken, onAuthChange });

      client.setTokens({ accessToken: "a1", refreshToken: "r1" });

      expect(client.getAccessToken()).toBeNull();
      expect(client.getRefreshToken()).toBeNull();
      expect(onAuthChange).not.toHaveBeenCalled();
    });

    it("setAccessToken is a no-op", () => {
      const onAuthChange = jest.fn();
      const getToken = jest.fn().mockResolvedValue("token-1");
      const client = new SublayHttpClient({ projectId: "proj1", getToken, onAuthChange });

      client.setAccessToken("a1");

      expect(client.getAccessToken()).toBeNull();
      expect(onAuthChange).not.toHaveBeenCalled();
    });

    it("clearTokens is a no-op", () => {
      const onAuthChange = jest.fn();
      const getToken = jest.fn().mockResolvedValue("token-1");
      const client = new SublayHttpClient({ projectId: "proj1", getToken, onAuthChange });

      client.clearTokens();

      expect(onAuthChange).not.toHaveBeenCalled();
    });
  });

  it("getAuthHeader() reads from getToken() rather than internal state", async () => {
    const getToken = jest.fn().mockResolvedValue("token-1");
    const client = new SublayHttpClient({ projectId: "proj1", getToken });

    await expect(client.getAuthHeader()).resolves.toBe("Bearer token-1");
    expect(getToken).toHaveBeenCalledTimes(1);
  });
});
