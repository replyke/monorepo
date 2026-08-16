import { describe, it, expect, afterEach, vi } from "vitest";
import { waitFor } from "@testing-library/react";

import {
  requestOAuthAuthorizationUrl,
  parseOAuthRedirectUrl,
  handleOAuthRedirect,
} from "./oauthCore";
import {
  makeSublayStore,
  mockAxiosPublic,
  resetAxiosMocks,
  stubFetchMock,
  unstubFetchMock,
  jsonResponse,
} from "../../test-utils";
import { armAuthGate, syncAuthGate, resetAuthGate } from "../../config/authGate";

describe("parseOAuthRedirectUrl", () => {
  it("extracts tokens from the fragment and ignores the query", () => {
    const parsed = parseOAuthRedirectUrl(
      "https://app.example.com/callback?foo=bar#accessToken=a1&refreshToken=r1",
    );
    expect(parsed).toEqual({
      accessToken: "a1",
      refreshToken: "r1",
      error: null,
      errorDescription: null,
    });
  });

  it("extracts error/error_description from the query when there is no fragment", () => {
    const parsed = parseOAuthRedirectUrl(
      "https://app.example.com/callback?error=access_denied&error_description=User+cancelled",
    );
    expect(parsed).toEqual({
      accessToken: null,
      refreshToken: null,
      error: "access_denied",
      errorDescription: "User cancelled",
    });
  });

  it("returns all nulls for a bare URL", () => {
    expect(parseOAuthRedirectUrl("https://app.example.com/callback")).toEqual({
      accessToken: null,
      refreshToken: null,
      error: null,
      errorDescription: null,
    });
  });
});

describe("requestOAuthAuthorizationUrl", () => {
  afterEach(() => {
    unstubFetchMock();
    // The gate's latches are module-level and shared across the whole run, so an
    // armed gate would leak into every test after this block.
    resetAuthGate();
  });

  it("POSTs to the authorize endpoint without an Authorization header", async () => {
    const { fetchMock } = stubFetchMock(async () =>
      jsonResponse({ authorizationUrl: "https://provider/auth" }),
    );

    const url = await requestOAuthAuthorizationUrl({
      projectId: "project-1",
      endpoint: "authorize",
      provider: "google",
      redirectAfterAuth: "https://app.example.com/done",
    });

    expect(url).toBe("https://provider/auth");
    const [calledUrl, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(calledUrl).toBe("https://api.sublay.io/v7/project-1/oauth/authorize");
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
    expect(JSON.parse(init.body as string)).toEqual({
      provider: "google",
      redirectAfterAuth: "https://app.example.com/done",
    });
  });

  it("attaches a Bearer header for the link endpoint when an access token is provided", async () => {
    const { fetchMock } = stubFetchMock(async () =>
      jsonResponse({ authorizationUrl: "https://provider/link" }),
    );

    await requestOAuthAuthorizationUrl({
      projectId: "project-1",
      endpoint: "link",
      provider: "github",
      redirectAfterAuth: "https://app.example.com/done",
      accessToken: "token-a",
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer token-a");
  });

  // `link` runs behind requireUserAuth and posts via raw `fetch`, so there is no
  // interceptor to recover a rejected token. It resolves through the auth gate
  // for the same reason the account-management thunks do — see authGate.ts.
  it("holds a link request until the bootstrap settles, then sends the token that arrived", async () => {
    const { fetchMock } = stubFetchMock(async () =>
      jsonResponse({ authorizationUrl: "https://provider/link" }),
    );

    armAuthGate();
    syncAuthGate({ accessToken: null, initialized: false });

    // The caller reads null from Redux on a cold start — this used to be
    // rejected outright by the platform hooks before anything could wait.
    const pending = requestOAuthAuthorizationUrl({
      projectId: "project-1",
      endpoint: "link",
      provider: "github",
      redirectAfterAuth: "https://app.example.com/done",
      accessToken: null,
    });

    await Promise.resolve();
    await Promise.resolve();
    expect(fetchMock).not.toHaveBeenCalled();

    syncAuthGate({ accessToken: "arrived-token", initialized: true });
    await pending;

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer arrived-token",
    );
  });

  it("throws the signed-in message once the bootstrap confirms nobody is signed in", async () => {
    const { fetchMock } = stubFetchMock(async () =>
      jsonResponse({ authorizationUrl: "https://provider/link" }),
    );

    armAuthGate();
    syncAuthGate({ accessToken: null, initialized: true });

    await expect(
      requestOAuthAuthorizationUrl({
        projectId: "project-1",
        endpoint: "link",
        provider: "github",
        redirectAfterAuth: "https://app.example.com/done",
        accessToken: null,
      }),
    ).rejects.toThrow("Must be authenticated to link an OAuth provider.");

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not attach a gated token to the authorize endpoint", async () => {
    // `authorize` is the sign-IN call. An armed gate returns whatever token is
    // current rather than the null passed in, so consulting it here would send
    // the already-signed-in user's bearer on a request that must be anonymous.
    const { fetchMock } = stubFetchMock(async () =>
      jsonResponse({ authorizationUrl: "https://provider/auth" }),
    );

    armAuthGate();
    syncAuthGate({ accessToken: "someone-elses-token", initialized: true });

    await requestOAuthAuthorizationUrl({
      projectId: "project-1",
      endpoint: "authorize",
      provider: "google",
      redirectAfterAuth: "https://app.example.com/done",
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it("throws the server's error message on a non-ok response", async () => {
    stubFetchMock(async () => jsonResponse({ error: "Unsupported provider" }, 400));

    await expect(
      requestOAuthAuthorizationUrl({
        projectId: "project-1",
        endpoint: "authorize",
        provider: "unknown",
        redirectAfterAuth: "https://app.example.com/done",
      }),
    ).rejects.toThrow("Unsupported provider");
  });
});

describe("handleOAuthRedirect", () => {
  afterEach(() => {
    resetAxiosMocks();
  });

  it("dispatches tokens then fires the refresh thunk when projectId is provided", async () => {
    const store = makeSublayStore();
    const axios = mockAxiosPublic();
    axios.mockResponse("post", { accessToken: "fresh", refreshToken: "rotated", user: null });

    const result = handleOAuthRedirect({
      dispatch: store.dispatch,
      projectId: "project-1",
      url: "https://app.example.com/callback?x=1#accessToken=a1&refreshToken=r1",
    });

    expect(result).toEqual({ success: true, error: null });
    expect(store.getState().sublay.auth.accessToken).toBe("a1");
    expect(store.getState().sublay.auth.initialized).toBe(true);

    await waitFor(() => expect(store.getState().sublay.auth.accessToken).toBe("fresh"));
    expect(axios.calls("post")[0].url).toBe("/project-1/auth/request-new-access-token");
  });

  it("dispatches tokens but skips the refresh thunk without a projectId", () => {
    const store = makeSublayStore();
    const dispatchSpy = vi.spyOn(store, "dispatch");

    const result = handleOAuthRedirect({
      dispatch: store.dispatch,
      projectId: null,
      url: "https://app.example.com/callback#accessToken=a1&refreshToken=r1",
    });

    expect(result).toEqual({ success: true, error: null });
    expect(store.getState().sublay.auth.accessToken).toBe("a1");
    // setTokens + setInitialized only — no nested refresh thunk dispatch.
    expect(dispatchSpy).toHaveBeenCalledTimes(2);
  });

  it("accepts pre-parsed params instead of a url string", () => {
    const store = makeSublayStore();

    const result = handleOAuthRedirect({
      dispatch: store.dispatch,
      projectId: null,
      params: { accessToken: "a1", refreshToken: "r1", error: null, errorDescription: null },
    });

    expect(result).toEqual({ success: true, error: null });
    expect(store.getState().sublay.auth.refreshToken).toBe("r1");
  });

  it("returns the error without dispatching when the redirect carries an error", () => {
    const store = makeSublayStore();
    const dispatchSpy = vi.spyOn(store, "dispatch");

    const result = handleOAuthRedirect({
      dispatch: store.dispatch,
      projectId: "project-1",
      url: "https://app.example.com/callback?error=access_denied&error_description=User+cancelled",
    });

    expect(result).toEqual({ success: false, error: "User cancelled" });
    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it("returns success:false without dispatching when there are neither tokens nor an error", () => {
    const store = makeSublayStore();
    const dispatchSpy = vi.spyOn(store, "dispatch");

    const result = handleOAuthRedirect({
      dispatch: store.dispatch,
      projectId: "project-1",
      url: "https://app.example.com/callback",
    });

    expect(result).toEqual({ success: false, error: null });
    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it("returns success:false when neither url nor params are given", () => {
    const store = makeSublayStore();
    const result = handleOAuthRedirect({ dispatch: store.dispatch, projectId: "project-1" });
    expect(result).toEqual({ success: false, error: null });
  });
});
