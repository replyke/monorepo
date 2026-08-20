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
import { readJwtExp, readJwtSub } from "../utils/jwt";

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
  const tokenChanged = state.accessToken !== currentAccessToken;
  currentAccessToken = state.accessToken;

  // Self-heal the clock-skew latch. `clockUnreliable` disables pre-emptive
  // rotation for the process, so a device whose clock was wrong at launch and
  // has since been corrected (NTP, manual fix) would otherwise stay on the
  // reactive-403 path for the rest of the session — which is exactly the path
  // that does not work on `optionalUserAuth` routes. A newly arrived token that
  // does NOT read as near-expiry is evidence the clock agrees with the server
  // again. Gated on the token actually changing so the decode cost lands only
  // while degraded, not on every store action.
  if (
    clockUnreliable &&
    tokenChanged &&
    state.accessToken &&
    !isExpiringSoon(state.accessToken)
  ) {
    clockUnreliable = false;
  }

  if (state.initialized && !opened) {
    opened = true;
    deferred.resolve();
    return;
  }

  // Re-close when `initialized` goes back to false — i.e. whenever the store
  // announces "bootstrapping again". A latch that only ever opened would let
  // requests out during such a window with no token, and since a re-bootstrap
  // is usually paired with `resetApiState()` (which forces every mounted RTK
  // query to refetch), those refetches would cache one account's stranger-data
  // against another. That is the same bug the gate exists to close.
  //
  // ⚠ NO SDK CODE DISPATCHES `setInitialized(false)` ANY MORE. This branch used
  // to describe the account-transition core, which drove
  // setTokens(accessToken: null) -> setInitialized(false) -> rotate ->
  // setInitialized(true) and needed the gate shut across the rotation. Since
  // validate-before-commit (`hooks/auth/accountTransition`) that window does
  // not exist: the incoming account's credential is exchanged OUT OF BAND,
  // before anything is torn down, and the teardown-plus-install that follows is
  // synchronous — there is no point inside it at which a request could be
  // issued, so there is nothing to gate. Every remaining `setInitialized`
  // dispatch in the SDK passes `true`.
  //
  // KEPT DELIBERATELY, not overlooked. `setInitialized` is a public export
  // (`index.ts`, under the store internals the platform packages and
  // integration-mode apps drive), so an app running its own bootstrap can still
  // announce a re-bootstrap from outside the SDK. Deleting this would silently
  // turn the gate into a one-way latch for those callers — a behaviour change
  // on a defensive path, in exchange for removing one boolean compare. If you
  // are here because coverage flags it as unreached: that is expected, and it
  // is reached by `authGate.test.ts`.
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
  //
  // A refresher that REJECTS is a failed rotation, not a failed request. Left
  // unguarded, the rejection would propagate out of `getAuthorizedToken` and
  // reject the axios REQUEST interceptor (and RTK's `prepareHeaders`), killing
  // the request before it is even sent — strictly worse than the pre-gate
  // behaviour, where a refresh failure only cost one retry.
  //
  // No refresher rejects today: all three callers bottom out in
  // `await dispatch(requestNewAccessTokenThunk(...))` without `.unwrap()`,
  // which resolves even for a rejected thunk. But `.unwrap()` is the idiomatic
  // way to surface thunk errors, and this single-flight promise is shared
  // across all three call sites — so adding it in one place would fail every
  // request in the app. Guarded rather than documented.
  let refreshed: string | undefined;
  try {
    refreshed = await refreshAccessToken(currentRefresher);
  } catch {
    refreshed = undefined;
  }

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

/**
 * Message thrown by `getAuthorizedTokenForAccount` when the active account
 * changed while a request was parked at the gate. Exported so callers can match
 * on it rather than re-deriving the wording.
 */
export const ACCOUNT_SWITCHED_MESSAGE =
  "The active account changed while this request was waiting. Please try again.";

/**
 * `getAuthorizedToken` for callers that must not have their request re-pointed
 * at a different account.
 *
 * Waiting at the gate makes the token read and the send non-atomic: an account
 * switch during the wait re-closes the gate and reopens it holding the INCOMING
 * account's token, so a parked request resumes under the wrong identity. For a
 * read that is stale data — the tradeoff `axiosPrivate` and `baseApi` already
 * accept. For a WRITE it is worse: a password set on an account the caller never
 * chose (with no current-password check server-side to reject it), or an OAuth
 * provider permanently linked to the wrong account. Those callers use this.
 *
 * Only an actual disagreement throws. A caller that started with no token (cold
 * start — the case the wait exists for) has no identity to compare, and an
 * unreadable `sub` means "don't know" rather than "mismatch"; both proceed,
 * which is the pre-wait behavior. A pre-emptive rotation mints a new token
 * string for the same `sub`, so idle-expiry recovery is unaffected.
 */
export async function getAuthorizedTokenForAccount(
  fallbackToken: string | null = null,
): Promise<string | null> {
  const startedAs = readJwtSub(fallbackToken);
  const token = await getAuthorizedToken(fallbackToken);
  const sendingAs = readJwtSub(token);

  if (startedAs && sendingAs && startedAs !== sendingAs) {
    throw new Error(ACCOUNT_SWITCHED_MESSAGE);
  }

  return token;
}
