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
 * ## The two codes
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
 * outer catch. It is raised before any unbind is attempted (the push-availability
 * lookup fails closed into it), so there is no binding at stake and blocking on
 * it would stop an otherwise healthy sign-out.
 *
 * ## The shape of the check
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
 * True only when the rejection is the server's own statement that it attempted
 * a push unbind and committed nothing. Everything else — transport failures,
 * pre-controller gates, the generic server error — is false.
 */
export function isUnbindFailure(error: unknown): boolean {
  const code = (error as { response?: { data?: { code?: unknown } } } | null)
    ?.response?.data?.code;

  return (
    typeof code === "string" &&
    (UNBIND_FAILURE_CODES as readonly string[]).includes(code)
  );
}
