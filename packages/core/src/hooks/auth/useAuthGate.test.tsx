import { describe, it, expect, afterEach, vi } from "vitest";

import { renderHookWithAxios, resetAxiosMocks } from "../../test-utils";

// Capture whatever `useAuthGate` registers, so the contract can be exercised
// DIRECTLY. Going through `getAuthorizedToken` instead would prove nothing: the
// gate wraps the refresher in its own defensive try/catch, so a refresher that
// rethrows looks identical from out there — which is exactly why this contract
// was enforced by nothing.
const captured: { refresher?: () => Promise<string | undefined> } = {};

vi.mock("../../config/authGate", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../config/authGate")>();
  return {
    ...actual,
    setAuthGateRefresher: (refresher?: () => Promise<string | undefined>) => {
      captured.refresher = refresher;
      actual.setAuthGateRefresher(refresher);
    },
  };
});

import useAuthGate from "./useAuthGate";

afterEach(() => {
  resetAxiosMocks();
  captured.refresher = undefined;
});

describe("useAuthGate's registered refresher", () => {
  it("RESOLVES undefined when the refresh is rejected by the server", async () => {
    // ⚠ MUST NOT REJECT. This function is awaited inside the shared
    // single-flight promise in `refreshAccessToken`, which the axios REQUEST
    // interceptor and RTK's `prepareHeaders` both wait on. A rejection there
    // rejects that shared promise for every waiting caller and kills their
    // requests BEFORE they are sent — app-wide, from one failed rotation.
    // The gate wants "no new token", not an exception.
    const { axiosPublic } = renderHookWithAxios(
      () => useAuthGate("project-1"),
      { accessToken: "stale", refreshToken: "refresh-1" },
    );
    axiosPublic.mockError("post", 403, { error: "Refresh token revoked" });

    expect(captured.refresher).toBeTypeOf("function");
    await expect(captured.refresher!()).resolves.toBeUndefined();
  });

  it("RESOLVES undefined when there is no stored refresh token", async () => {
    // The thunk rejects here without any network call at all — the path that
    // reaches the rejection soonest, and the one a cold start hits.
    renderHookWithAxios(() => useAuthGate("project-1"), {
      accessToken: "stale",
      refreshToken: null,
    });

    await expect(captured.refresher!()).resolves.toBeUndefined();
  });

  it("resolves the rotated access token on success", async () => {
    const { axiosPublic } = renderHookWithAxios(
      () => useAuthGate("project-1"),
      { accessToken: "stale", refreshToken: "refresh-1" },
    );
    axiosPublic.mockResponse("post", {
      accessToken: "fresh",
      refreshToken: "refresh-2",
      user: { id: "user-1" },
    });

    await expect(captured.refresher!()).resolves.toBe("fresh");
  });
});
