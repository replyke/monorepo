// Shared auth-readiness gate for outbound requests.
//
// Two failure modes this exists to close, both of which are invisible on
// `optionalUserAuth` routes because the server answers 200-as-a-stranger
// instead of erroring:
//
// 1. COLD START. `AuthInitializer` renders `children` immediately while the
//    auth bootstrap is still a network round trip away. React runs child
//    effects before parent effects, so a mount-time fetch (the entity feed,
//    a comment section) leaves before any token exists. On `requireUserAuth`
//    routes that self-heals — the server sends a bare 403 and the response
//    interceptor refreshes and retries. On `optionalUserAuth` routes there is
//    no error to react to: `req.userId` is simply undefined, so `userReaction`
//    comes back null for every row, block exclusions no-op, and `isSaved` is
//    empty. Nothing refetches when the token lands, because the leaf fetchers
//    depend on `[axios, projectId]` and both are stable.
//
// 2. IDLE EXPIRY. Access tokens live 30 minutes. Past that, `optionalUserAuth`
//    fails `jwt.verify` and calls `next()` anyway, so a woken-up tab silently
//    reverts to stranger-data until some unrelated `requireUserAuth` call
//    happens to 403 and triggers the reactive refresh.
//
// Both are fixed the same way: no request may attach an Authorization header
// until the bootstrap has settled, and a token that is about to expire is
// rotated before it goes out rather than after it fails.
//
// The gate is DISARMED until a Sublay provider arms it. Callers outside a
// provider (unit tests, direct `baseApi` dispatches) resolve immediately, so
// this is inert unless a real app mounted a real provider.

import { refreshAccessToken } from "./refreshAccessToken";

/** How close to `exp` a token may get before we rotate it pre-emptively. */
const EXPIRY_SKEW_MS = 60_000;

/**
 * Ceiling on how long a request will wait for the bootstrap. `setInitialized`
 * runs in `initializeAuthThunk`'s `finally`, so the gate opens even when the
 * bootstrap fails — this only covers the case where the thunk never dispatches
 * at all (e.g. an `AccountManager` that registers but never signals ready).
 * Without it, one stuck provider would hang every request in the app forever.
 */
const READY_TIMEOUT_MS = 5_000;

type Refresher = () => Promise<string | undefined>;

interface Deferred {
  promise: Promise<void>;
  resolve: () => void;
}

function createDeferred(): Deferred {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

let armed = false;
let opened = false;
let deferred = createDeferred();
let currentAccessToken: string | null = null;
let currentRefresher: Refresher | undefined;
let readyTimeoutMs = READY_TIMEOUT_MS;

/**
 * Marks the gate active. Called from a provider's render body (via a lazy
 * `useState` initializer) so it runs strictly before any child renders or
 * fires a mount effect — otherwise the very requests this exists to catch
 * would slip past while the gate was still disarmed.
 */
export function armAuthGate(options?: { timeoutMs?: number }): void {
  armed = true;
  if (options?.timeoutMs !== undefined) readyTimeoutMs = options.timeoutMs;
}

/**
 * Mirrors auth state out of Redux so the request path can read it without a
 * React subscription. `accessToken` must be read through here rather than
 * captured in an interceptor closure: an interceptor registered before the
 * bootstrap holds `null`, and it is still the instance running when the gate
 * opens.
 */
export function syncAuthGate(state: {
  accessToken: string | null;
  initialized: boolean;
}): void {
  currentAccessToken = state.accessToken;
  if (state.initialized && !opened) {
    opened = true;
    deferred.resolve();
  }
}

/** Registers the bound `requestNewAccessToken` used for pre-emptive rotation. */
export function setAuthGateRefresher(refresher: Refresher | undefined): void {
  currentRefresher = refresher;
}

/** Test seam — the module-level state above is shared across a whole run. */
export function resetAuthGate(): void {
  armed = false;
  opened = false;
  deferred = createDeferred();
  currentAccessToken = null;
  currentRefresher = undefined;
  readyTimeoutMs = READY_TIMEOUT_MS;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    // Don't hold a Node process (or a Jest/Vitest worker) open on this timer.
    (timer as unknown as { unref?: () => void }).unref?.();
  });
}

/**
 * Reads `exp` out of a JWT payload without verifying it — we only need to know
 * whether it is stale, and the server is still the authority on validity.
 * Returns null for anything unparseable, which callers treat as "don't know",
 * leaving the reactive 403 path as the backstop.
 */
function readExpiry(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;

    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "=",
    );

    let json: string;
    if (typeof atob === "function") {
      // atob yields a binary string; re-decode so non-ASCII claims (names,
      // bios) don't corrupt JSON.parse.
      const binary = atob(padded);
      json = decodeURIComponent(
        Array.from(binary, (char) =>
          `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`,
        ).join(""),
      );
    } else if (typeof Buffer !== "undefined") {
      json = Buffer.from(padded, "base64").toString("utf8");
    } else {
      return null;
    }

    const exp = JSON.parse(json)?.exp;
    return typeof exp === "number" ? exp * 1000 : null;
  } catch {
    return null;
  }
}

function isExpiringSoon(token: string): boolean {
  const expiresAt = readExpiry(token);
  if (expiresAt === null) return false;
  return expiresAt - Date.now() < EXPIRY_SKEW_MS;
}

/**
 * Resolves with the access token a request should carry: null when nobody is
 * signed in, a freshly rotated token when the held one is about to expire,
 * otherwise the held one.
 *
 * Callers must attach the RESULT, not a value captured earlier.
 *
 * `fallbackToken` is what the caller would have sent on its own. While the gate
 * is disarmed — no provider mounted, so nothing is keeping the box in sync —
 * it is returned verbatim, making this a no-op wrapper around the pre-gate
 * behavior rather than a source of silently-null headers.
 */
export async function getAuthorizedToken(
  fallbackToken: string | null = null,
): Promise<string | null> {
  if (!armed) return fallbackToken;

  if (!opened) {
    await Promise.race([deferred.promise, delay(readyTimeoutMs)]);
  }

  const token = currentAccessToken;
  if (!token || !isExpiringSoon(token)) return token;

  // Shares the single-flight lock with the response interceptor's 403 path.
  // The server rotates the refresh token on every use with reuse detection, so
  // a burst of waking requests must produce exactly one rotation.
  const refreshed = await refreshAccessToken(currentRefresher);

  // On failure keep going with the stale token rather than dropping the header:
  // `requireUserAuth` will 403 and the response interceptor still gets its
  // chance to recover.
  return refreshed ?? currentAccessToken;
}
