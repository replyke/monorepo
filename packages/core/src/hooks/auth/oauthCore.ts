import type { AppDispatch } from "../../store/types";
import { setTokens, setInitialized } from "../../store/slices/authSlice";
import { requestNewAccessTokenThunk } from "../../store/slices/authThunks";
import { getAuthorizedTokenForAccount } from "../../config/authGate";

/**
 * Platform-agnostic OAuth helpers shared by the web (`@sublay/react-js`) and
 * Expo (`@sublay/expo`) `useOAuthSignIn` hooks.
 *
 * These helpers deliberately contain NO browser/DOM globals (`window`,
 * `document`, `localStorage`) and NO React Native globals, so the same code
 * path runs on every platform. Each platform owns only its own I/O: obtaining
 * the redirect URL (web reads `window.location`, Expo opens a web-browser auth
 * session) and any navigation/URL cleanup.
 */

// Single source of truth for the API base URL. Matches the web hook's prior
// hardcoded value exactly — do NOT swap in `getApiBaseUrl()`, which is
// env-aware and would diverge from the web hook's production-only behavior.
export const OAUTH_BASE_URL = "https://api.sublay.io/v7";

/**
 * Server-call head: POST to `/{projectId}/oauth/{authorize|link}` and return the
 * provider `authorizationUrl`.
 *
 * - `authorize` is unauthenticated; `link` requires the caller's access token,
 *   passed via `accessToken` (sent as a Bearer header only when present).
 * - Throws an `Error` carrying the server's `error` body on a non-ok response.
 *
 * `link` resolves its token through the auth gate rather than trusting the
 * value the caller read, which is what makes it survive a cold start (the
 * caller's `accessToken` is still null while the bootstrap is in flight) and an
 * idle stretch (a token at or past `exp` is rotated before it goes out). It
 * throws if the active account changed while it waited, so the provider cannot
 * be linked to an account the caller never chose. This is a raw `fetch`, so
 * there is no interceptor to recover if the token is rejected anyway — same
 * limitation as the account-management thunks.
 *
 * `authorize` deliberately does NOT consult the gate: it is the sign-IN call,
 * and an armed gate returns whatever token is current rather than the null the
 * caller passed — which would attach the already-signed-in user's bearer to a
 * request that must go out unauthenticated.
 */
export async function requestOAuthAuthorizationUrl({
  projectId,
  endpoint,
  provider,
  redirectAfterAuth,
  accessToken,
  baseUrl = OAUTH_BASE_URL,
}: {
  projectId: string;
  endpoint: "authorize" | "link";
  provider: string;
  redirectAfterAuth: string;
  /** Required for `link`, omitted for `authorize`. */
  accessToken?: string | null;
  baseUrl?: string;
}): Promise<string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (endpoint === "link") {
    // `ForAccount` because linking is a WRITE, and a permanent one: a request
    // parked at the gate across an account switch would otherwise resume and
    // attach the provider to whichever account is active when it reopens.
    //
    // The signed-in check is owned here rather than in the platform hooks:
    // they read `accessToken` from Redux and would reject a cold start before
    // anything could wait.
    const token = await getAuthorizedTokenForAccount(accessToken ?? null);
    if (!token) {
      throw new Error("Must be authenticated to link an OAuth provider.");
    }
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}/${projectId}/oauth/${endpoint}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ provider, redirectAfterAuth }),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Failed to initiate OAuth");
  }

  const data = await response.json();
  return data.authorizationUrl as string;
}

export interface OAuthRedirectParams {
  accessToken: string | null;
  refreshToken: string | null;
  error: string | null;
  errorDescription: string | null;
}

/**
 * Tolerantly parse a redirect URL string into OAuth params.
 *
 * The Sublay OAuth callback carries tokens in the URL **fragment**
 * (`#accessToken=...&refreshToken=...`) and errors in the **query**
 * (`?error=...&error_description=...`). This splits the string by hand rather
 * than relying on `new URL().hash`, whose fragment handling is unreliable under
 * React Native's URL polyfill — exactly where the tokens live.
 */
export function parseOAuthRedirectUrl(url: string): OAuthRedirectParams {
  const hashIndex = url.indexOf("#");
  const fragment = hashIndex >= 0 ? url.substring(hashIndex + 1) : "";
  const beforeHash = hashIndex >= 0 ? url.substring(0, hashIndex) : url;

  const queryIndex = beforeHash.indexOf("?");
  const query = queryIndex >= 0 ? beforeHash.substring(queryIndex + 1) : "";

  const fragmentParams = new URLSearchParams(fragment);
  const queryParams = new URLSearchParams(query);

  return {
    accessToken: fragmentParams.get("accessToken"),
    refreshToken: fragmentParams.get("refreshToken"),
    error: queryParams.get("error"),
    errorDescription: queryParams.get("error_description"),
  };
}

export interface HandleOAuthRedirectResult {
  /** True when tokens were found and dispatched. */
  success: boolean;
  /** A human-readable error message when the redirect carried an `?error=`. */
  error: string | null;
}

/**
 * Token-handling tail: given a redirect URL **string**, extract the tokens /
 * error and, on success, perform the same Redux dispatches the web hook has
 * always done (`setTokens` → `setInitialized` → `requestNewAccessTokenThunk`).
 *
 * Pure of any I/O beyond dispatching: it does not read globals, navigate, or
 * clean the URL — the caller owns that. Accepts a URL string (or pre-parsed
 * `params`, e.g. from `expo-linking`) so any platform can feed it whatever it
 * obtained however it likes.
 *
 * Returns `{ success, error }` instead of throwing so callers can drive their
 * own loading/error UI state.
 */
export function handleOAuthRedirect({
  dispatch,
  projectId,
  url,
  params,
}: {
  dispatch: AppDispatch;
  projectId: string | null | undefined;
  url?: string;
  params?: OAuthRedirectParams;
}): HandleOAuthRedirectResult {
  const parsed = params ?? (url != null ? parseOAuthRedirectUrl(url) : null);

  if (!parsed) {
    return { success: false, error: null };
  }

  // Errors arrive in the query string. Surface them without dispatching.
  if (parsed.error) {
    return { success: false, error: parsed.errorDescription || parsed.error };
  }

  // Tokens arrive in the fragment. Only dispatch when both are present.
  if (parsed.accessToken && parsed.refreshToken) {
    dispatch(
      setTokens({
        accessToken: parsed.accessToken,
        refreshToken: parsed.refreshToken,
      })
    );
    dispatch(setInitialized(true));

    // Fetch the user profile so `useAccountSync` can persist the account. The
    // thunk reads the just-set refresh token from Redux, calls the server, and
    // dispatches setUser + setUserInUserSlice on success.
    if (projectId) {
      dispatch(requestNewAccessTokenThunk({ projectId }));
    }

    return { success: true, error: null };
  }

  return { success: false, error: null };
}
