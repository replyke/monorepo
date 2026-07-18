// Shared single-flight token refresh.
//
// A burst of requests can 401/403 at the same moment — most commonly when a
// long-idle session wakes up and several queued calls fire with the same
// expired access token. The server rotates the refresh token on every use
// (rotation + reuse detection), so we must NOT fire concurrent rotations: the
// second one would present an already-spent refresh token. This coalesces every
// concurrent caller — the axios response interceptor AND raw-fetch callers like
// `useAskContent` — onto a single in-flight rotation so the refresh token is
// rotated exactly once per burst.
let refreshPromise: Promise<string | undefined> | null = null;

/**
 * Runs `requestNewAccessToken` at most once concurrently. Callers that arrive
 * while a refresh is already in flight receive the same promise and resolve with
 * the same rotated access token. The lock clears once the rotation settles.
 */
export function refreshAccessToken(
  requestNewAccessToken: (() => Promise<string | undefined>) | undefined
): Promise<string | undefined> {
  if (!refreshPromise) {
    refreshPromise = (
      requestNewAccessToken?.() ?? Promise.resolve(undefined)
    ).finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}
