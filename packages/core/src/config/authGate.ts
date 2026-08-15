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
import { readJwtExp } from "../utils/jwt";

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
 * The token value a pre-emptive rotation already failed on. Without this, a
 * revoked refresh token turns every single outbound request into an extra
 * failed rotation round trip plus an error log, because the held token still
 * reads as expiring. The reactive 403 path was damped by `prevRequest.sent`;
 * this is the gate's equivalent.
 */
let rotationFailedFor: string | null = null;

/**
 * Set when a rotation returns a token that ALREADY reads as near-expiry. A
 * freshly minted 30-minute token can only look stale if the local clock is off
 * by ~29 minutes, so the fault is the clock, not the token. Pre-emptive
 * rotation is abandoned at that point — otherwise every request would rotate a
 * perfectly valid token, and the server rotates the refresh token on every use
 * with reuse detection. The reactive 403 path stays as the backstop.
 */
let clockUnreliable = false;

/**
 * Marks the gate active. Called from a provider's render body (via a lazy
 * `useState` initializer) so it runs strictly before any child renders or
 * fires a mount effect — otherwise the very requests this exists to catch
 * would slip past while the gate was still disarmed.
 */
export function armAuthGate(options?: { timeoutMs?: number }): void {
  // Never arm during SSR. This module's state is process-global on a Node
  // server, and effects never run there — so `syncAuthGate` could never open
  // what render armed, and every later request in that process would stall for
  // the full ready timeout. There is no session to wait for server-side anyway:
  // tokens live in the browser. Guarded here rather than at the call site so
  // any future caller inherits it.
  if (typeof window === "undefined") return;

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
    return;
  }

  // Re-close when `initialized` goes back to false. `signOutThunk` and
  // `confirmAccountDeletionThunk` deliberately drive
  // setTokens(accessToken: null) -> setInitialized(false) -> rotate ->
  // setInitialized(true) when another account remains, and `useSwitchAccount`
  // dispatches `resetApiState()` across that window — which forces every
  // mounted RTK query to refetch. A latch that only ever opened would let those
  // refetches out with no token and cache the OUTGOING account's stranger-data
  // against the incoming one. This is the same bug the gate exists to close, in
  // the one place the store explicitly announces "bootstrapping again".
  if (!state.initialized && opened) {
    opened = false;
    deferred = createDeferred();
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
  rotationFailedFor = null;
  clockUnreliable = false;
}

/**
 * Races the gate against a timeout, clearing the timer when the gate wins so a
 * burst of held requests doesn't leave one dangling timer each.
 */
async function waitForOpen(): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, readyTimeoutMs);
    // Don't hold a Node process (or a Vitest worker) open on this timer.
    (timer as unknown as { unref?: () => void }).unref?.();
  });

  try {
    await Promise.race([deferred.promise, timeout]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

function isExpiringSoon(token: string): boolean {
  const expiresAt = readJwtExp(token);
  // An unreadable `exp` means "don't know" here, NOT "expired": pre-emptively
  // rotating on it would spend the refresh token for nothing. The reactive 403
  // path stays as the backstop. (`useAccountSync` reads the same claim with the
  // opposite policy — see utils/jwt.)
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
    await waitForOpen();
  }

  const token = currentAccessToken;
  if (!token || clockUnreliable || !isExpiringSoon(token)) return token;

  // One pre-emptive attempt per stale token value, not one per request.
  if (token === rotationFailedFor) return token;

  // Shares the single-flight lock with the response interceptor's 403 path.
  // The server rotates the refresh token on every use with reuse detection, so
  // a burst of waking requests must produce exactly one rotation.
  const refreshed = await refreshAccessToken(currentRefresher);

  if (!refreshed) {
    rotationFailedFor = token;
    // Keep going with the stale token rather than dropping the header:
    // `requireUserAuth` will 403 and the response interceptor still gets its
    // chance to recover.
    return currentAccessToken;
  }

  if (isExpiringSoon(refreshed)) {
    clockUnreliable = true;
    return refreshed;
  }

  rotationFailedFor = null;
  return refreshed;
}
