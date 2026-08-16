import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const useProject = vi.fn();
const useSublayDispatch = vi.fn();
const useSublaySelector = vi.fn();
const requestOAuthAuthorizationUrl = vi.fn();
const handleOAuthRedirect = vi.fn();
const dispatch = vi.fn();

vi.mock("@sublay/core", () => ({
  useProject: () => useProject(),
  useSublayDispatch: () => useSublayDispatch(),
  useSublaySelector: (selector: unknown) => useSublaySelector(selector),
  selectAccessToken: "selectAccessToken-placeholder",
  requestOAuthAuthorizationUrl: (...args: unknown[]) => requestOAuthAuthorizationUrl(...args),
  handleOAuthRedirect: (...args: unknown[]) => handleOAuthRedirect(...args),
}));

import useOAuthSignIn from "./useOAuthSignIn";

function setWindowHref(href: string) {
  Object.defineProperty(window, "location", {
    value: new URL(href) as unknown as Location,
    writable: true,
  });
}

describe("useOAuthSignIn (react-js)", () => {
  beforeEach(() => {
    useProject.mockReturnValue({ projectId: "project-1" });
    useSublayDispatch.mockReturnValue(dispatch);
    useSublaySelector.mockReturnValue(null);
    setWindowHref("https://app.example.com/current-page");
    vi.spyOn(window.history, "replaceState").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe("initiateOAuth", () => {
    it("requests an unauthenticated authorize URL and redirects the browser to it", async () => {
      requestOAuthAuthorizationUrl.mockResolvedValue("https://provider/auth");
      const { result } = renderHook(() => useOAuthSignIn());

      await act(async () => {
        await result.current.initiateOAuth({ provider: "google" });
      });

      expect(requestOAuthAuthorizationUrl).toHaveBeenCalledWith({
        projectId: "project-1",
        endpoint: "authorize",
        provider: "google",
        redirectAfterAuth: "https://app.example.com/current-page",
        accessToken: null,
      });
      expect(window.location.href).toBe("https://provider/auth");
    });

    it("uses the explicit redirectAfterAuth over window.location.href when provided", async () => {
      requestOAuthAuthorizationUrl.mockResolvedValue("https://provider/auth");
      const { result } = renderHook(() => useOAuthSignIn());

      await act(async () => {
        await result.current.initiateOAuth({
          provider: "google",
          redirectAfterAuth: "https://app.example.com/callback",
        });
      });

      expect(requestOAuthAuthorizationUrl).toHaveBeenCalledWith(
        expect.objectContaining({ redirectAfterAuth: "https://app.example.com/callback" }),
      );
    });

    it("sets an error and skips the request when projectId is unavailable", async () => {
      useProject.mockReturnValue({ projectId: null });
      const { result } = renderHook(() => useOAuthSignIn());

      await act(async () => {
        await result.current.initiateOAuth({ provider: "google" });
      });

      expect(requestOAuthAuthorizationUrl).not.toHaveBeenCalled();
      expect(result.current.error).toBe("No projectId available.");
    });

    it("surfaces the rejection message and clears isLoading on failure", async () => {
      requestOAuthAuthorizationUrl.mockRejectedValue(new Error("network down"));
      const { result } = renderHook(() => useOAuthSignIn());

      await act(async () => {
        await result.current.initiateOAuth({ provider: "google" });
      });

      expect(result.current.error).toBe("network down");
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("linkOAuthProvider", () => {
    it("delegates the signed-in check to the gated core call rather than short-circuiting", async () => {
      // The `!accessToken` guard used to live here and reject outright. That
      // failed a cold start, where the token is still null while the bootstrap
      // is in flight. `requestOAuthAuthorizationUrl` now waits for the auth gate
      // and throws the same message only once the bootstrap says nobody is
      // signed in — so the hook must let the call through and surface the throw.
      useSublaySelector.mockReturnValue(null);
      requestOAuthAuthorizationUrl.mockRejectedValue(
        new Error("Must be authenticated to link an OAuth provider."),
      );
      const { result } = renderHook(() => useOAuthSignIn());

      await act(async () => {
        await result.current.linkOAuthProvider({ provider: "github" });
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
      const { result } = renderHook(() => useOAuthSignIn());

      await act(async () => {
        await result.current.linkOAuthProvider({ provider: "github" });
      });

      expect(requestOAuthAuthorizationUrl).toHaveBeenCalledWith(
        expect.objectContaining({ endpoint: "link", accessToken: "access-token-1" }),
      );
    });
  });

  describe("handleOAuthCallback", () => {
    it("returns true and cleans the URL on a successful redirect", () => {
      handleOAuthRedirect.mockReturnValue({ success: true, error: null });
      setWindowHref("https://app.example.com/callback#accessToken=a&refreshToken=r");
      const { result } = renderHook(() => useOAuthSignIn());

      let callbackResult: boolean;
      act(() => {
        callbackResult = result.current.handleOAuthCallback();
      });

      expect(handleOAuthRedirect).toHaveBeenCalledWith({
        url: "https://app.example.com/callback#accessToken=a&refreshToken=r",
        dispatch,
        projectId: "project-1",
      });
      expect(callbackResult!).toBe(true);
      expect(window.history.replaceState).toHaveBeenCalledWith({}, "", "/callback");
    });

    it("sets the error, cleans the URL, and returns false on a redirect error", () => {
      handleOAuthRedirect.mockReturnValue({ success: false, error: "access_denied" });
      const { result } = renderHook(() => useOAuthSignIn());

      let callbackResult: boolean;
      act(() => {
        callbackResult = result.current.handleOAuthCallback();
      });

      expect(callbackResult!).toBe(false);
      expect(result.current.error).toBe("access_denied");
      expect(window.history.replaceState).toHaveBeenCalled();
    });

    it("returns false without touching the URL when there is nothing to handle", () => {
      handleOAuthRedirect.mockReturnValue({ success: false, error: null });
      const { result } = renderHook(() => useOAuthSignIn());

      let callbackResult: boolean;
      act(() => {
        callbackResult = result.current.handleOAuthCallback();
      });

      expect(callbackResult!).toBe(false);
      expect(window.history.replaceState).not.toHaveBeenCalled();
    });
  });
});
