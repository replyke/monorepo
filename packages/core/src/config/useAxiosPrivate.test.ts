import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import type { InternalAxiosRequestConfig } from "axios";

vi.mock("../hooks/auth", () => ({ useAuth: vi.fn() }));

import { useAuth } from "../hooks/auth";
import useAxiosPrivate from "./useAxiosPrivate";
import { axiosPrivate } from "./axios";
import {
  stubAxiosAdapter,
  okAxiosResponse,
  axiosErrorWithStatus,
  resetAxiosMocks,
} from "../test-utils";
import { armAuthGate, syncAuthGate, setAuthGateRefresher } from "./authGate";

const mockedUseAuth = vi.mocked(useAuth);

/** Minimal unsigned JWT — only `exp` is ever read from it. */
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

/** Any request not yet retried (no `.sent` flag) gets a 403; retries succeed. */
function stubRefreshableAdapter() {
  return vi.fn(async (config: InternalAxiosRequestConfig) => {
    if (config.sent) return okAxiosResponse({ ok: true }, 200, config);
    throw axiosErrorWithStatus(403, undefined, config);
  });
}

afterEach(() => {
  resetAxiosMocks();
});

describe("useAxiosPrivate", () => {
  it("attaches the current access token when no Authorization header is set", async () => {
    mockedUseAuth.mockReturnValue({
      accessToken: "token-a",
      requestNewAccessToken: vi.fn(),
    } as never);
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) =>
      okAxiosResponse({ ok: true }, 200, config),
    );
    stubAxiosAdapter(axiosPrivate, adapter);

    renderHook(() => useAxiosPrivate());
    await axiosPrivate.get("/x");

    const sentConfig = adapter.mock.calls[0][0];
    expect(sentConfig.headers.Authorization).toBe("Bearer token-a");
  });

  it("leaves an explicit Authorization header untouched", async () => {
    mockedUseAuth.mockReturnValue({
      accessToken: "token-a",
      requestNewAccessToken: vi.fn(),
    } as never);
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) =>
      okAxiosResponse({ ok: true }, 200, config),
    );
    stubAxiosAdapter(axiosPrivate, adapter);

    renderHook(() => useAxiosPrivate());
    await axiosPrivate.get("/x", { headers: { Authorization: "Bearer explicit" } });

    const sentConfig = adapter.mock.calls[0][0];
    expect(sentConfig.headers.Authorization).toBe("Bearer explicit");
  });

  it("refreshes exactly once and retries with the new token when multiple requests 403 concurrently", async () => {
    let resolveRefresh!: (token: string) => void;
    const requestNewAccessToken = vi.fn(
      () => new Promise<string>((resolve) => { resolveRefresh = resolve; }),
    );
    mockedUseAuth.mockReturnValue({
      accessToken: "stale-token",
      requestNewAccessToken,
    } as never);
    stubAxiosAdapter(axiosPrivate, stubRefreshableAdapter());

    renderHook(() => useAxiosPrivate());

    const p1 = axiosPrivate.get("/a");
    const p2 = axiosPrivate.get("/b");

    await waitFor(() => expect(requestNewAccessToken).toHaveBeenCalledTimes(1));

    resolveRefresh("fresh-token");

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1.data).toEqual({ ok: true });
    expect(r2.data).toEqual({ ok: true });
    expect(requestNewAccessToken).toHaveBeenCalledTimes(1);
  });

  it("does not refresh on a coded 403 (semantic rejection) and rejects as-is", async () => {
    const requestNewAccessToken = vi.fn();
    mockedUseAuth.mockReturnValue({
      accessToken: "token-a",
      requestNewAccessToken,
    } as never);
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      throw axiosErrorWithStatus(
        403,
        { code: "project/plan-required", error: "Paid plan required" },
        config,
      );
    });
    stubAxiosAdapter(axiosPrivate, adapter);

    renderHook(() => useAxiosPrivate());

    await expect(axiosPrivate.get("/a")).rejects.toMatchObject({
      response: { status: 403, data: { code: "project/plan-required" } },
    });
    expect(requestNewAccessToken).not.toHaveBeenCalled();
    expect(adapter).toHaveBeenCalledTimes(1);
  });

  it("rejects the original error when the refresh fails to produce a token", async () => {
    const requestNewAccessToken = vi.fn().mockResolvedValue(undefined);
    mockedUseAuth.mockReturnValue({
      accessToken: "stale-token",
      requestNewAccessToken,
    } as never);
    stubAxiosAdapter(axiosPrivate, stubRefreshableAdapter());

    renderHook(() => useAxiosPrivate());

    await expect(axiosPrivate.get("/a")).rejects.toMatchObject({
      response: { status: 403 },
    });
    expect(requestNewAccessToken).toHaveBeenCalledTimes(1);
  });

  it("ejects its interceptors on unmount", async () => {
    mockedUseAuth.mockReturnValue({
      accessToken: "token-a",
      requestNewAccessToken: vi.fn(),
    } as never);
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) =>
      okAxiosResponse({ ok: true }, 200, config),
    );
    stubAxiosAdapter(axiosPrivate, adapter);

    const { unmount } = renderHook(() => useAxiosPrivate());

    await axiosPrivate.get("/x");
    expect(adapter.mock.calls[0][0].headers.Authorization).toBe("Bearer token-a");

    unmount();

    await axiosPrivate.get("/y");
    expect(adapter.mock.calls[1][0].headers.Authorization).toBeUndefined();
  });

  describe("bare 401 recovery (replaces what `Bearer null` used to buy)", () => {
    /** Any request not yet retried gets `status`; retries succeed. */
    function stubStatusThenSuccess(status: number, data?: unknown) {
      return vi.fn(async (config: InternalAxiosRequestConfig) => {
        if (config.sent) return okAxiosResponse({ ok: true }, 200, config);
        throw axiosErrorWithStatus(status, data, config);
      });
    }

    it("refreshes and retries on a bare 401, as it does on a bare 403", async () => {
      // With no header sent, `requireUserAuth` answers 401 where it used to
      // answer 403 for `Bearer null`. That recovery path has to survive.
      const requestNewAccessToken = vi.fn().mockResolvedValue("fresh-token");
      mockedUseAuth.mockReturnValue({
        accessToken: null,
        requestNewAccessToken,
      } as never);
      const adapter = stubStatusThenSuccess(401);
      stubAxiosAdapter(axiosPrivate, adapter);

      renderHook(() => useAxiosPrivate());

      await expect(axiosPrivate.get("/x")).resolves.toMatchObject({
        status: 200,
      });
      expect(requestNewAccessToken).toHaveBeenCalledTimes(1);
      expect(adapter.mock.calls[1][0].headers.Authorization).toBe(
        "Bearer fresh-token",
      );
    });

    it("does NOT refresh on a 401 that carries a semantic code", async () => {
      // Controllers raise coded 401s (space/auth-required, entity/user-required,
      // auth/user-required, push-device/unauthorized, auth/token-reuse-detected).
      // A refresh cannot fix any of them, and rotating on each would burn the
      // refresh token — the same trap the 403 branch already avoids.
      const requestNewAccessToken = vi.fn().mockResolvedValue("fresh-token");
      mockedUseAuth.mockReturnValue({
        accessToken: "token-a",
        requestNewAccessToken,
      } as never);
      stubAxiosAdapter(
        axiosPrivate,
        stubStatusThenSuccess(401, { code: "space/auth-required" }),
      );

      renderHook(() => useAxiosPrivate());

      await expect(axiosPrivate.get("/x")).rejects.toMatchObject({
        response: { status: 401 },
      });
      expect(requestNewAccessToken).not.toHaveBeenCalled();
    });

    it("rejects a bare 401 when there is nothing to refresh with", async () => {
      // Genuinely signed out: one refresh attempt, then the original error —
      // the same outcome and the same round-trip count as the old sentinel.
      const requestNewAccessToken = vi.fn().mockResolvedValue(undefined);
      mockedUseAuth.mockReturnValue({
        accessToken: null,
        requestNewAccessToken,
      } as never);
      stubAxiosAdapter(axiosPrivate, stubStatusThenSuccess(401));

      renderHook(() => useAxiosPrivate());

      await expect(axiosPrivate.get("/x")).rejects.toMatchObject({
        response: { status: 401 },
      });
      expect(requestNewAccessToken).toHaveBeenCalledTimes(1);
    });

    it("retries a bare 401 only once", async () => {
      const requestNewAccessToken = vi.fn().mockResolvedValue("fresh-token");
      mockedUseAuth.mockReturnValue({
        accessToken: null,
        requestNewAccessToken,
      } as never);
      // Always 401, even on the retry.
      const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
        throw axiosErrorWithStatus(401, undefined, config);
      });
      stubAxiosAdapter(axiosPrivate, adapter);

      renderHook(() => useAxiosPrivate());

      await expect(axiosPrivate.get("/x")).rejects.toMatchObject({
        response: { status: 401 },
      });
      expect(requestNewAccessToken).toHaveBeenCalledTimes(1);
      expect(adapter).toHaveBeenCalledTimes(2);
    });
  });

  describe("with the auth gate armed", () => {
    it("holds a mount-time request until the bootstrap lands, then sends the ARRIVED token", async () => {
      // The exact cold-start shape: the interceptor is registered while
      // `accessToken` is still null, and that closure is the one still running
      // when the token arrives. Reading the closure would send `Bearer null` to
      // an optionalUserAuth route, which answers 200-as-a-stranger with no
      // error for anything to react to.
      mockedUseAuth.mockReturnValue({
        accessToken: null,
        requestNewAccessToken: vi.fn(),
      } as never);
      const adapter = vi.fn(async (config: InternalAxiosRequestConfig) =>
        okAxiosResponse({ ok: true }, 200, config),
      );
      stubAxiosAdapter(axiosPrivate, adapter);

      armAuthGate();
      syncAuthGate({ accessToken: null, initialized: false });

      renderHook(() => useAxiosPrivate());

      const inFlight = axiosPrivate.get("/feed");
      await Promise.resolve();
      await Promise.resolve();
      expect(adapter).not.toHaveBeenCalled();

      syncAuthGate({ accessToken: "arrived-token", initialized: true });
      await inFlight;

      expect(adapter).toHaveBeenCalledTimes(1);
      expect(adapter.mock.calls[0][0].headers.Authorization).toBe(
        "Bearer arrived-token",
      );
    });

    it("sends NO Authorization header when signed out", async () => {
      // Previously emitted the literal `Bearer null`. That sentinel blocked
      // tightening `optionalUserAuth` server-side: a signed-out visitor sending
      // it to a public route would get a 403 instead of public content.
      mockedUseAuth.mockReturnValue({
        accessToken: null,
        requestNewAccessToken: vi.fn(),
      } as never);
      const adapter = vi.fn(async (config: InternalAxiosRequestConfig) =>
        okAxiosResponse({ ok: true }, 200, config),
      );
      stubAxiosAdapter(axiosPrivate, adapter);

      armAuthGate();
      syncAuthGate({ accessToken: null, initialized: true });

      renderHook(() => useAxiosPrivate());
      await axiosPrivate.get("/x");

      // Verified non-vacuous: restoring the unconditional header fails this
      // with `expected 'Bearer null' to be undefined`.
      expect(adapter.mock.calls[0][0].headers.Authorization).toBeUndefined();
    });

    it("rotates a near-expiry token before the request leaves", async () => {
      // The 30-minute-idle case: optionalUserAuth ignores an expired token
      // rather than rejecting it, so there is no 403 to recover from.
      const fresh = jwtExpiringIn(1800);
      const requestNewAccessToken = vi.fn(async () => fresh);
      mockedUseAuth.mockReturnValue({
        accessToken: null,
        requestNewAccessToken,
      } as never);
      const adapter = vi.fn(async (config: InternalAxiosRequestConfig) =>
        okAxiosResponse({ ok: true }, 200, config),
      );
      stubAxiosAdapter(axiosPrivate, adapter);

      armAuthGate();
      setAuthGateRefresher(requestNewAccessToken);
      syncAuthGate({ accessToken: jwtExpiringIn(-60), initialized: true });

      renderHook(() => useAxiosPrivate());
      await axiosPrivate.get("/x");

      expect(requestNewAccessToken).toHaveBeenCalledTimes(1);
      expect(adapter.mock.calls[0][0].headers.Authorization).toBe(
        `Bearer ${fresh}`,
      );
    });

    it("leaves an explicit Authorization header untouched without waiting", async () => {
      mockedUseAuth.mockReturnValue({
        accessToken: null,
        requestNewAccessToken: vi.fn(),
      } as never);
      const adapter = vi.fn(async (config: InternalAxiosRequestConfig) =>
        okAxiosResponse({ ok: true }, 200, config),
      );
      stubAxiosAdapter(axiosPrivate, adapter);

      armAuthGate();
      syncAuthGate({ accessToken: null, initialized: false });

      renderHook(() => useAxiosPrivate());

      await axiosPrivate.get("/x", {
        headers: { Authorization: "Bearer explicit" },
      });

      expect(adapter.mock.calls[0][0].headers.Authorization).toBe(
        "Bearer explicit",
      );
    });
  });
});
