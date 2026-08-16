import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const useProject = vi.fn();
const useSublayDispatch = vi.fn();
const useSublaySelector = vi.fn();
const requestOAuthAuthorizationUrl = vi.fn();
const parseOAuthRedirectUrl = vi.fn();
const handleOAuthRedirect = vi.fn();
const openAuthSessionAsync = vi.fn();
const linkingParse = vi.fn();
const dispatch = vi.fn();

vi.mock("@sublay/core", () => ({
  useProject: () => useProject(),
  useSublayDispatch: () => useSublayDispatch(),
  useSublaySelector: (selector: unknown) => useSublaySelector(selector),
  selectAccessToken: "selectAccessToken-placeholder",
  requestOAuthAuthorizationUrl: (...args: unknown[]) => requestOAuthAuthorizationUrl(...args),
  parseOAuthRedirectUrl: (...args: unknown[]) => parseOAuthRedirectUrl(...args),
  handleOAuthRedirect: (...args: unknown[]) => handleOAuthRedirect(...args),
}));

vi.mock("expo-web-browser", () => ({
  openAuthSessionAsync: (...args: unknown[]) => openAuthSessionAsync(...args),
}));

vi.mock("expo-linking", () => ({
  parse: (...args: unknown[]) => linkingParse(...args),
}));

import useOAuthSignIn from "./useOAuthSignIn";

describe("useOAuthSignIn (expo)", () => {
  beforeEach(() => {
    useProject.mockReturnValue({ projectId: "project-1" });
    useSublayDispatch.mockReturnValue(dispatch);
    useSublaySelector.mockReturnValue(null);
    parseOAuthRedirectUrl.mockReturnValue({
      accessToken: null,
      refreshToken: null,
      error: null,
      errorDescription: null,
    });
    linkingParse.mockReturnValue({ queryParams: {} });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("initiateOAuth", () => {
    it("requires redirectAfterAuth since there is no window.location default on mobile", async () => {
      const { result } = renderHook(() => useOAuthSignIn());

      await act(async () => {
        await result.current.initiateOAuth({ provider: "google" });
      });

      expect(requestOAuthAuthorizationUrl).not.toHaveBeenCalled();
      expect(result.current.error).toBe("redirectAfterAuth is required on mobile.");
    });

    it("sets an error and skips the request when projectId is unavailable", async () => {
      useProject.mockReturnValue({ projectId: null });
      const { result } = renderHook(() => useOAuthSignIn());

      await act(async () => {
        await result.current.initiateOAuth({
          provider: "google",
          redirectAfterAuth: "myapp://auth/callback",
        });
      });

      expect(requestOAuthAuthorizationUrl).not.toHaveBeenCalled();
      expect(result.current.error).toBe("No projectId available.");
    });

    it("opens the system browser and dispatches tokens on a successful redirect", async () => {
      requestOAuthAuthorizationUrl.mockResolvedValue("https://provider/auth");
      openAuthSessionAsync.mockResolvedValue({
        type: "success",
        url: "myapp://auth/callback#accessToken=a1&refreshToken=r1",
      });
      parseOAuthRedirectUrl.mockReturnValue({
        accessToken: "a1",
        refreshToken: "r1",
        error: null,
        errorDescription: null,
      });
      handleOAuthRedirect.mockReturnValue({ success: true, error: null });

      const { result } = renderHook(() => useOAuthSignIn());

      await act(async () => {
        await result.current.initiateOAuth({
          provider: "google",
          redirectAfterAuth: "myapp://auth/callback",
        });
      });

      expect(requestOAuthAuthorizationUrl).toHaveBeenCalledWith({
        projectId: "project-1",
        endpoint: "authorize",
        provider: "google",
        redirectAfterAuth: "myapp://auth/callback",
        accessToken: null,
      });
      expect(openAuthSessionAsync).toHaveBeenCalledWith(
        "https://provider/auth",
        "myapp://auth/callback",
      );
      expect(handleOAuthRedirect).toHaveBeenCalledWith({
        dispatch,
        projectId: "project-1",
        params: { accessToken: "a1", refreshToken: "r1", error: null, errorDescription: null },
      });
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("quietly clears isLoading without an error when the user cancels/dismisses the browser", async () => {
      requestOAuthAuthorizationUrl.mockResolvedValue("https://provider/auth");
      openAuthSessionAsync.mockResolvedValue({ type: "dismiss" });

      const { result } = renderHook(() => useOAuthSignIn());

      await act(async () => {
        await result.current.initiateOAuth({
          provider: "google",
          redirectAfterAuth: "myapp://auth/callback",
        });
      });

      expect(handleOAuthRedirect).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("surfaces a redirect error returned by handleOAuthRedirect", async () => {
      requestOAuthAuthorizationUrl.mockResolvedValue("https://provider/auth");
      openAuthSessionAsync.mockResolvedValue({
        type: "success",
        url: "myapp://auth/callback?error=access_denied",
      });
      handleOAuthRedirect.mockReturnValue({ success: false, error: "access_denied" });

      const { result } = renderHook(() => useOAuthSignIn());

      await act(async () => {
        await result.current.initiateOAuth({
          provider: "google",
          redirectAfterAuth: "myapp://auth/callback",
        });
      });

      expect(result.current.error).toBe("access_denied");
    });

    it("reports a generic failure when no tokens come back and there is no explicit error", async () => {
      requestOAuthAuthorizationUrl.mockResolvedValue("https://provider/auth");
      openAuthSessionAsync.mockResolvedValue({
        type: "success",
        url: "myapp://auth/callback",
      });
      handleOAuthRedirect.mockReturnValue({ success: false, error: null });

      const { result } = renderHook(() => useOAuthSignIn());

      await act(async () => {
        await result.current.initiateOAuth({
          provider: "google",
          redirectAfterAuth: "myapp://auth/callback",
        });
      });

      expect(result.current.error).toBe("OAuth sign-in failed: no tokens were returned.");
    });

    it("merges expo-linking's query error fields with the core fragment parse", async () => {
      requestOAuthAuthorizationUrl.mockResolvedValue("https://provider/auth");
      openAuthSessionAsync.mockResolvedValue({
        type: "success",
        url: "myapp://auth/callback?error=access_denied&error_description=User+cancelled",
      });
      parseOAuthRedirectUrl.mockReturnValue({
        accessToken: null,
        refreshToken: null,
        error: null,
        errorDescription: null,
      });
      linkingParse.mockReturnValue({
        queryParams: { error: "access_denied", error_description: "User cancelled" },
      });
      handleOAuthRedirect.mockReturnValue({ success: false, error: "User cancelled" });

      const { result } = renderHook(() => useOAuthSignIn());

      await act(async () => {
        await result.current.initiateOAuth({
          provider: "google",
          redirectAfterAuth: "myapp://auth/callback",
        });
      });

      expect(handleOAuthRedirect).toHaveBeenCalledWith({
        dispatch,
        projectId: "project-1",
        params: {
          accessToken: null,
          refreshToken: null,
          error: "access_denied",
          errorDescription: "User cancelled",
        },
      });
      expect(result.current.error).toBe("User cancelled");
    });

    it("surfaces the rejection message and clears isLoading when the authorize request throws", async () => {
      requestOAuthAuthorizationUrl.mockRejectedValue(new Error("network down"));
      const { result } = renderHook(() => useOAuthSignIn());

      await act(async () => {
        await result.current.initiateOAuth({
          provider: "google",
          redirectAfterAuth: "myapp://auth/callback",
        });
      });

      expect(result.current.error).toBe("network down");
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("linkOAuthProvider", () => {
    it("delegates the signed-in check to the gated core call rather than short-circuiting", async () => {
      // The `!accessToken` guard used to live here and reject outright. That
      // failed a cold start, where the token is still null while the bootstrap
      // is in flight — the sharpest case on mobile, since the app can be resumed
      // straight onto a settings screen. `requestOAuthAuthorizationUrl` now waits
      // for the auth gate and throws the same message only once the bootstrap
      // says nobody is signed in.
      useSublaySelector.mockReturnValue(null);
      requestOAuthAuthorizationUrl.mockRejectedValue(
        new Error("Must be authenticated to link an OAuth provider."),
      );
      const { result } = renderHook(() => useOAuthSignIn());

      await act(async () => {
        await result.current.linkOAuthProvider({
          provider: "github",
          redirectAfterAuth: "myapp://settings",
        });
      });

      expect(requestOAuthAuthorizationUrl).toHaveBeenCalledWith(
        expect.objectContaining({ endpoint: "link", accessToken: null }),
      );
      expect(result.current.error).toBe("Must be authenticated to link an OAuth provider.");
      expect(result.current.isLoading).toBe(false);
    });

    it("attaches the current access token when linking a provider", async () => {
      useSublaySelector.mockReturnValue("access-token-1");
      requestOAuthAuthorizationUrl.mockResolvedValue("https://provider/link");
      openAuthSessionAsync.mockResolvedValue({ type: "dismiss" });

      const { result } = renderHook(() => useOAuthSignIn());

      await act(async () => {
        await result.current.linkOAuthProvider({
          provider: "github",
          redirectAfterAuth: "myapp://settings",
        });
      });

      expect(requestOAuthAuthorizationUrl).toHaveBeenCalledWith(
        expect.objectContaining({ endpoint: "link", accessToken: "access-token-1" }),
      );
    });
  });

  describe("handleOAuthCallback", () => {
    it("is a no-op compatibility shim that always returns false", () => {
      const { result } = renderHook(() => useOAuthSignIn());
      expect(result.current.handleOAuthCallback()).toBe(false);
      expect(handleOAuthRedirect).not.toHaveBeenCalled();
    });
  });
});
