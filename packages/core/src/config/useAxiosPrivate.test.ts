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

const mockedUseAuth = vi.mocked(useAuth);

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
});
