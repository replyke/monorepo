import { getSublayLogLevel } from "./handleError";

/**
 * Did `/auth/sign-out` refuse *the push unbind*?
 *
 * Every sign-out path in this SDK is best-effort by default — the server's own
 * rule is that a user can ALWAYS sign out, so a failure must not strand them
 * inside an account they asked to leave. Exactly one failure is exempt: the
 * atomic unbind. When the request carried a `pushDevice` and the server could
 * not remove the push binding, NOTHING was committed — the token family is
 * still alive and so is the binding. Tearing down locally there deletes the
 * only credential that could ever retry, leaving the user receiving
 * notifications from an account they can no longer reach. That one case must
 * block; everything else must not.
 *
 * ## Why the code, and not "did I send a pushDevice"
 *
 * Sending a `pushDevice` says the client *asked* for an unbind, not that one
 * was attempted. Five gates reject before the sign-out controller ever runs —
 * quota exhaustion (`429`), pending deletion (`423`), migration (`503`), the IP
 * rate limiter, and body validation (`400`) — and none of them touches a push
 * binding. Keying on the request made every one of those block account removal
 * for any user whose app had ever called `register()`: a project that blew its
 * monthly quota locked its whole push-enabled population out of removing an
 * account. The server already distinguishes these cases in its response; the
 * client simply was not reading it.
 *
 * ## The two blocking codes
 *
 * Both are emitted by `v7/controllers/auth/signOut.ts` from a single branch
 * guarded by `shouldUnbind`, so reaching either one *proves* an unbind was
 * attempted inside the transaction and that the transaction rolled back:
 *
 * - `auth/device-deregistration-failed` — the `PushDevices` destroy itself threw.
 * - `auth/sign-out-failed` — the destroy succeeded but the token-family write
 *   failed, so the rollback took the unbind with it. Same client-visible
 *   outcome: the binding survives and the credential must survive with it.
 *
 * Deliberately NOT in the list: `auth/server-error`, the controller's generic
 * outer catch. It is the endpoint's answer for a fault that is not an unbind
 * attempt, so there is no binding at stake and blocking on it would stop an
 * otherwise healthy sign-out.
 *
 * ## The third code, which must NOT block: `PUSH_UNBIND_SKIPPED_CODE`
 *
 * There is one outcome that is neither "the unbind failed" nor "the unbind
 * happened": the server could not determine whether this project even has push
 * devices, so it never attempted one. Its availability lookup reads Redis and
 * falls back to the database, so an ordinary cache blip reaches it.
 *
 * That case used to answer with `auth/device-deregistration-failed`, which
 * meant every path here rethrew and NOTHING below it ran — no local teardown,
 * no account removal. **The user could not sign out**, on the one operation
 * this SDK guarantees always completes, because a cache was briefly down. It
 * is the same trade `@sublay/js` reversed for the same reason: a stuck user is
 * worse than a skipped unbind.
 *
 * So the server now completes the sign-out and names the skip in a `200` body,
 * and this module's job on it is to REPORT rather than block —
 * `warnPushUnbindSkipped` below. The binding may still be live and the
 * credential is gone, which is worth a loud line in the console; it is not
 * worth locking someone inside their account.
 *
 * ## The shape of the checks
 *
 * Positive membership only — a path must never branch on the *absence* of a
 * code. A transport failure carries no `response` at all, a gate rejection
 * carries a different code, and both land in the same "not an unbind failure"
 * bucket without either being asked to prove a negative. This mirrors
 * `config/useAxiosPrivate.ts`, which discriminates the suspension `403` on
 * `data.code` for the same reason.
 */
export const UNBIND_FAILURE_CODES = [
  "auth/device-deregistration-failed",
  "auth/sign-out-failed",
] as const;

export type UnbindFailureCode = (typeof UNBIND_FAILURE_CODES)[number];

/**
 * The server's statement that it signed the user out WITHOUT attempting the
 * unbind, because it could not determine whether a binding exists.
 *
 * Carried on a `200`, not on an error — see the header for why it must not be
 * an error status and must not be a bare `204` either.
 */
export const PUSH_UNBIND_SKIPPED_CODE = "auth/push-unbind-status-unknown";

/**
 * True only when the rejection is the server's own statement that it attempted
 * a push unbind and committed nothing. Everything else — transport failures,
 * pre-controller gates, the generic server error, and the skipped-unbind
 * report above — is false.
 */
export function isUnbindFailure(error: unknown): boolean {
  const code = (error as { response?: { data?: { code?: unknown } } } | null)
    ?.response?.data?.code;

  return (
    typeof code === "string" &&
    (UNBIND_FAILURE_CODES as readonly string[]).includes(code)
  );
}

/**
 * True when a SUCCESSFUL sign-out response says the unbind was skipped.
 *
 * Takes the response body, not an error: this arrives on a `200`, so nothing
 * throws and the caller has to look.
 */
export function isPushUnbindSkipped(responseData: unknown): boolean {
  return (
    (responseData as { code?: unknown } | null | undefined)?.code ===
    PUSH_UNBIND_SKIPPED_CODE
  );
}

/**
 * Reports a sign-out that completed without removing this device's push
 * binding, and says what the app can do about it.
 *
 * The sign-out is not reversed and the caller is not failed — by the time this
 * runs the server has already destroyed the session. The account's credential
 * is gone with it, so nothing in this SDK can retry the unbind; the binding is
 * removed the next time that account registers on this device, or by the
 * server's dead-token pruning once the token stops being deliverable.
 *
 * Honours `setSublayLogLevel("silent")` like every other line the SDK writes.
 */
export function warnPushUnbindSkipped(responseData: unknown): boolean {
  if (!isPushUnbindSkipped(responseData)) return false;

  if (getSublayLogLevel() !== "silent") {
    console.warn(
      "Sublay: signed out, but the push unbind was SKIPPED — the server could " +
        "not determine whether this project has push devices, so it did not " +
        "attempt one. This device may still be bound to that account and can " +
        "keep receiving its notifications. The sign-out itself completed; the " +
        "binding clears when that account next registers on this device, or " +
        "when the server prunes the token as undeliverable."
    );
  }

  return true;
}
