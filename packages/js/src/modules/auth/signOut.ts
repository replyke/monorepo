import type { AxiosResponse } from "axios";
import { SublayHttpClient } from "../../core/client";
import { PushDeviceIdentifier } from "../../interfaces/Push";

/**
 * The server's statement, on a `200`, that it signed the user out WITHOUT
 * attempting the push unbind — its availability lookup (Redis, falling back to
 * the database) could not tell it whether this project even has push devices,
 * so it never looked for a binding.
 *
 * Carried on a success, not on an error, and deliberately so. The SDKs reject a
 * sign-out on exactly two codes — the ones that PROVE an unbind was attempted
 * and rolled back (`UNBIND_FAILURE_CODES`) — so a `5xx` here has no good
 * spelling: reuse one of those and a cache blip locks the user inside the
 * account, carry any other code and the SDK signs out locally anyway and the
 * skip is never reported at all. It is not a bare `204` either, because `204` is this endpoint's way of
 * saying "there is nothing left to remove", which is a lie when nobody looked.
 * Matches `PUSH_UNBIND_SKIPPED_CODE` in `@sublay/core`
 * (`utils/unbindFailure.ts`); both read the same body the same way.
 */
const PUSH_UNBIND_STATUS_UNKNOWN_CODE = "auth/push-unbind-status-unknown";

/**
 * The only two failures that must NOT sign the user out locally.
 *
 * A user can ALWAYS sign out — that is the server's rule and this SDK's — so a
 * failed sign-out clears the local tokens and resolves. Exactly one failure is
 * exempt: the atomic unbind. When the request carried a `pushDevice` and the
 * server could not remove the push binding, NOTHING was committed — the token
 * family is still alive and so is the binding. Clearing the tokens there
 * deletes the only credential that could ever retry, leaving the user
 * receiving notifications from an account they can no longer reach.
 *
 * ## Why the code, and not "did I send a pushDevice"
 *
 * Sending a `pushDevice` says the client ASKED for an unbind, not that one was
 * attempted. Gates reject before the sign-out controller ever runs — quota
 * exhaustion (`429`), pending deletion (`423`), migration (`503`), the IP rate
 * limiter, body validation (`400`) — and none of them touches a push binding.
 * Keying on the request would block account removal for every user whose app
 * had ever registered a device: one project over its monthly quota would lock
 * its whole push-enabled population inside their accounts.
 *
 * Both codes are emitted by `v7/controllers/auth/signOut.ts` from a single
 * branch guarded by `shouldUnbind`, so reaching either one proves an unbind was
 * attempted inside the transaction and that the transaction rolled back:
 *
 * - `auth/device-deregistration-failed` — the `PushDevices` destroy threw.
 * - `auth/sign-out-failed` — the destroy succeeded but the token-family write
 *   failed, so the rollback took the unbind with it. Same client-visible
 *   outcome: the binding survives and the credential must survive with it.
 *
 * Deliberately NOT here: `auth/server-error`, the controller's generic outer
 * catch. It is the endpoint's answer for a fault that is not an unbind attempt,
 * so there is no binding at stake and blocking on it would strand a user over
 * an otherwise recoverable sign-out.
 *
 * Matches `UNBIND_FAILURE_CODES` in `@sublay/core`
 * (`utils/unbindFailure.ts`); both read the same body the same way.
 */
const UNBIND_FAILURE_CODES = [
  "auth/device-deregistration-failed",
  "auth/sign-out-failed",
] as const;

/**
 * True only when the rejection is the server's own statement that it attempted
 * a push unbind and committed nothing. Everything else — transport failures,
 * pre-controller gates, the generic server error — is false.
 *
 * Positive membership only, never the absence of a code: a transport failure
 * carries no `response` at all and a gate rejection carries a different code,
 * and both must land in "not an unbind failure" without being asked to prove a
 * negative. Same rule, same shape, as `isUnbindFailure` in `@sublay/core`.
 */
function isUnbindFailure(error: unknown): boolean {
  const code = (error as { response?: { data?: { code?: unknown } } } | null)
    ?.response?.data?.code;

  return (
    typeof code === "string" &&
    (UNBIND_FAILURE_CODES as readonly string[]).includes(code)
  );
}

export interface SignOutProps {
  /**
   * Defaults to the SDK's stored refresh token (SDK-managed mode). Pass it
   * explicitly in host-managed mode, where the SDK holds no refresh token.
   */
  refreshToken?: string;
  /**
   * Optional. When supplied — and the project has the `push` bundle — the
   * server deletes this user's push binding for that device in the SAME
   * transaction as the token-family destroy: signing out unbinds the device's
   * push, or nothing happens at all.
   *
   * **Needs a refresh token to have any effect.** The unbind is scoped to the
   * `sub` of the refresh token, which is what stops one account removing
   * another account's binding on a shared device — so with no token there is no
   * user to scope it to and the server answers `204` before it ever looks at
   * `pushDevice`. When none can be resolved the field is DROPPED from the
   * request rather than sent into that silent no-op, the sign-out proceeds
   * normally, and the returned `pushUnbindSkipped` says so. Watch for it in
   * **host-managed mode**: such a client is built with `getToken` and no
   * `initialTokens`, and its `setTokens` is inert, so it starts with no refresh
   * token and can never acquire one. Pass `refreshToken` explicitly alongside
   * `pushDevice` there.
   *
   * If the unbind fails the request fails (HTTP 500, code
   * `auth/device-deregistration-failed` or `auth/sign-out-failed`) and NOTHING
   * is committed — the session survives so the caller can retry, and this call
   * rethrows WITHOUT clearing the SDK's local tokens, so the credential that
   * retry needs is still there.
   *
   * That is the ONLY failure that leaves you signed in. Every other one — a
   * `429` from the rate limiter or a quota gate, a `423`, a `503`, a `400` on
   * the body, a dropped connection — never touched a push binding, so it
   * clears the local tokens and RESOLVES: a user must always be able to sign
   * out. See `UNBIND_FAILURE_CODES`.
   *
   * Omit it and the request is byte-identical to before this field existed.
   */
  pushDevice?: PushDeviceIdentifier;
}

/**
 * Why the unbind did not happen. Present only when `pushUnbindSkipped` is
 * `true`, and it exists because THE TWO SKIPS ARE RECOVERED DIFFERENTLY — a
 * caller that cannot tell them apart can only ever pick the wrong remedy for
 * one of them:
 *
 * - `no-refresh-token` — this SDK never asked. Nothing was destroyed either:
 *   with no token the server has no session to end, so the account, its
 *   credential and its binding are all still there. **Retryable**: re-issue
 *   the sign-out with an explicit `refreshToken` and the unbind happens.
 * - `push-unbind-status-unknown` — the server was asked and could not answer.
 *   The sign-out itself DID commit, so the credential that would have driven a
 *   retry is gone; re-issuing achieves nothing. The binding clears when that
 *   account next registers on this device, or when the server prunes the token
 *   as undeliverable.
 */
export type PushUnbindSkipReason =
  | "no-refresh-token"
  | "push-unbind-status-unknown";

export interface SignOutResult {
  /**
   * `true` whenever a `pushDevice` was supplied and the unbind did NOT happen,
   * so this device's push binding for that account may still be live. Either
   * the SDK declined to ask (no refresh token to scope the unbind to) or the
   * server could not answer whether a binding exists; `pushUnbindSkipReason`
   * says which, and the two are recovered differently.
   *
   * `false` means NO SKIP WAS REPORTED — by this SDK or by the server. It is
   * not a promise that no skip happened, and the difference is not academic:
   * the server declines the unbind for several reasons it answers with a plain
   * `204`, and every one of them reads `false` here.
   *
   *   - The refresh token is authentic but expired beyond the server's unbind
   *     window (90 days past `exp`), so there is no subject to scope the unbind
   *     to. Reachable from this SDK by passing an old `refreshToken` explicitly
   *     alongside `pushDevice`.
   *   - The refresh token is malformed or fails signature verification.
   *   - The project has no `push` bundle, so no binding can exist.
   *   - The unbind ran and matched zero rows — the binding was already gone, or
   *     was never registered under this device key.
   *
   * The server logs each of those under its own reason; only the case where it
   * could not determine whether a binding exists is reported in the response,
   * because that is the one where the binding may still be LIVE and nobody
   * looked. The rest either prove there was nothing to remove or leave a device
   * key the server cannot attribute to a user, and neither gives the caller
   * anything to act on beyond what it already knows.
   *
   * A request that failed short of an unbind attempt reads `false` too — a
   * gate's `429` or `423`, a `503`, a `400`, a dropped connection. Those clear
   * the local tokens and resolve rather than reject (see `UNBIND_FAILURE_CODES`
   * for why), and none of them is a REPORTED skip; they are logged with a
   * warning instead.
   *
   * The sign-out itself is unaffected by the flag in both directions: a user
   * must always be able to sign out, so a skipped unbind never fails the call
   * and never leaves the local tokens in place.
   */
  pushUnbindSkipped: boolean;
  /** Set only when `pushUnbindSkipped` is `true`. See `PushUnbindSkipReason`. */
  pushUnbindSkipReason?: PushUnbindSkipReason;
}

/**
 * The `200` body `/auth/sign-out` sends when it signed the user out without
 * attempting the push unbind (`v7/controllers/auth/signOut.ts`). Every field is
 * optional because the endpoint's ordinary answer is a `204` with NO body at
 * all — `data` is then `""` or `undefined`, never this shape — so the code must
 * be read positively off `code` and never inferred from a missing field.
 */
interface SignOutResponseBody {
  pushUnbindSkipped?: boolean;
  code?: string;
  message?: string;
}

/**
 * What axios hands back for this endpoint.
 *
 * The ordinary answer is a bodyless `204`, which axios surfaces as `""` — not
 * `undefined` — so the empty string has to be in the type or the declared shape
 * does not describe the response the code actually receives. The JSON body is
 * the exception, sent only when the server has something to report about a
 * skipped push unbind.
 */
type SignOutResponseData = SignOutResponseBody | "" | undefined;

export async function signOut(
  client: SublayHttpClient,
  data?: SignOutProps
): Promise<SignOutResult> {
  const refreshToken = data?.refreshToken ?? client.getRefreshToken();

  // SIGN OUT FIRST, REPORT THE SKIPPED UNBIND AFTER.
  //
  // `/auth/sign-out` returns 204 for a body with no `refreshToken` WITHOUT
  // reading `pushDevice` — the unbind is scoped to the token's `sub` and there
  // is nothing to scope it to — so sending the field there would tell the
  // caller the binding was deleted while it is untouched.
  //
  // The honest answer is NOT to refuse the call. This guard used to throw
  // before the request went out and before `clearTokens`, which in SDK-managed
  // mode (refresh token held in memory only) meant that after any page reload
  // there was no token to resolve, so `signOut({ pushDevice })` threw and the
  // user could not sign out AT ALL — trading a silent no-op for a stuck
  // session, on the one operation that must always be available.
  //
  // So: the field is dropped, the sign-out is issued and the local tokens are
  // cleared exactly as they would be without it — the request is byte-identical
  // to the same call with no `pushDevice`, so one client state cannot behave
  // two ways — and the caller learns what did not happen from the result (and
  // from a warning, for callers that ignore it).
  //
  // Host-managed mode is what makes this reachable rather than theoretical, and
  // it is exactly the mode the docblock above points callers at: such a client
  // is constructed with `getToken` and no `initialTokens`, and `setTokens` is
  // inert, so it starts with no refresh token and can never acquire one. The
  // test is on the RESOLVED token rather than on the mode, so a client built
  // with both `getToken` and `initialTokens` — which nothing forbids — still
  // gets its unbind.
  const localUnbindSkipped = Boolean(data?.pushDevice) && !refreshToken;

  const body: Record<string, unknown> = refreshToken ? { refreshToken } : {};
  if (data?.pushDevice && !localUnbindSkipped) body.pushDevice = data.pushDevice;

  // ── THE STRICTNESS IS SCOPED TO UNBIND FAILURES. ─────────────────────────
  //
  // Rethrowing skips `clearTokens` below, which is the client half of the
  // atomicity guarantee: without it the server can honestly refuse the unbind
  // and this SDK deletes the credential anyway, leaving the user receiving
  // notifications from an account they can no longer reach.
  //
  // It applies ONLY to the server's own statement that it attempted an unbind
  // and committed nothing (`isUnbindFailure`). Everything else — no response at
  // all, a pre-controller gate, the generic server error — proceeds with the
  // local teardown and RESOLVES, matching `@sublay/core`'s sign-out thunk and
  // the server's rule that a user can always sign out. Failing here on every
  // non-2xx is what made this call unusable offline: a user with no connection
  // could not sign out of their own device.
  //
  // The server-side session can outlive such a teardown — it ends when the
  // refresh token expires, or on the next successful sign-out from a client
  // that still holds one.
  let response: AxiosResponse<SignOutResponseData> | undefined;
  try {
    response = await client.projectInstance.post<SignOutResponseData>(
      "/auth/sign-out",
      body
    );
  } catch (error) {
    if (isUnbindFailure(error)) throw error;
    console.warn(
      "signOut: the server sign-out did not complete, so the session may still " +
        "be live on the server until its refresh token expires. Signing out " +
        "locally anyway — a user must always be able to sign out; only a " +
        "refused push unbind keeps the local session, because that is the one " +
        "failure that leaves a binding to retry against.",
      error
    );
  }
  client.clearTokens();

  // THE SECOND SKIP, AND WHY THE FLAG COVERS BOTH.
  //
  // A 2xx does not promise the unbind happened. The server completes the
  // sign-out and names a skipped unbind in the body when it could not
  // determine whether this project has push devices — see
  // `PUSH_UNBIND_STATUS_UNKNOWN_CODE`. Reporting `pushUnbindSkipped: false`
  // there would be the exact failure this flag exists to prevent: a caller
  // told the binding is gone while it may be live.
  //
  // Read POSITIVELY, off the code — never by branching on the absence of one.
  // A `204` carries no body at all and a plain `200` carries no code, and both
  // must land in "not skipped" without either being asked to prove a negative.
  // Same rule, same code, as `isPushUnbindSkipped` in `@sublay/core`.
  //
  // The two skips cannot both fire: this one requires that `pushDevice` was
  // sent, which requires a resolved refresh token, which is precisely what
  // `localUnbindSkipped` says was missing.
  const serverUnbindSkipped =
    typeof response?.data === "object" &&
    response.data !== null &&
    response.data.code === PUSH_UNBIND_STATUS_UNKNOWN_CODE;

  if (localUnbindSkipped) {
    console.warn(
      "signOut: signed out, but the push unbind was SKIPPED — `pushDevice` was " +
        "supplied and no refresh token could be resolved (none stored and none " +
        "provided). The unbind is scoped to the refresh token's subject, so the " +
        "server would have unbound nothing. This device keeps receiving that " +
        "account's notifications until something else removes the binding. Pass " +
        "`refreshToken` alongside `pushDevice` — required in host-managed mode, " +
        "where the SDK stores no refresh token."
    );
    return {
      pushUnbindSkipped: true,
      pushUnbindSkipReason: "no-refresh-token",
    };
  }

  if (serverUnbindSkipped) {
    console.warn(
      "signOut: signed out, but the push unbind was SKIPPED — the server could " +
        "not determine whether this project has push devices, so it did not " +
        "attempt one. This device may still be bound to that account and can " +
        "keep receiving its notifications. The sign-out itself committed, so " +
        "there is no credential left to retry with: the binding clears when " +
        "that account next registers on this device, or when the server prunes " +
        "the token as undeliverable."
    );
    return {
      pushUnbindSkipped: true,
      pushUnbindSkipReason: "push-unbind-status-unknown",
    };
  }

  return { pushUnbindSkipped: false };
}
