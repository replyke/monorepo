/**
 * Thrown when a write is blocked because the acting user is suspended.
 *
 * The server rejects participation/content writes for a suspended user with
 * `403` + body `{ error, code: "user/suspended", reason, endDate }`
 * (`endDate: null` = indefinite). The response interceptor
 * (`config/useAxiosPrivate.ts`) discriminates that response on `code` BEFORE
 * the generic 403 → token-refresh branch and rejects with this typed error, so
 * a blocked write neither triggers a spurious token refresh nor is silently
 * retried, and app callers can `catch` it and branch on the suspension.
 */
export const SUSPENDED_ERROR_CODE = "user/suspended";

export class SuspendedError extends Error {
  /** Always `"user/suspended"` — matches the server's response `code`. */
  readonly code: typeof SUSPENDED_ERROR_CODE;
  /** Human-readable reason for the suspension, if the moderator provided one. */
  readonly reason: string | null;
  /** ISO end date of the suspension, or `null` for an indefinite suspension. */
  readonly endDate: string | null;

  constructor({
    message,
    reason,
    endDate,
  }: {
    message?: string;
    reason: string | null;
    endDate: string | null;
  }) {
    super(message ?? "This account is suspended.");
    this.name = "SuspendedError";
    this.code = SUSPENDED_ERROR_CODE;
    this.reason = reason;
    this.endDate = endDate;

    // Restore prototype chain for `instanceof` across transpile targets.
    Object.setPrototypeOf(this, SuspendedError.prototype);
  }
}

/** Narrowing helper so callers don't have to rely on `instanceof` alone. */
export function isSuspendedError(err: unknown): err is SuspendedError {
  return (
    err instanceof SuspendedError ||
    (typeof err === "object" &&
      err !== null &&
      (err as { code?: unknown }).code === SUSPENDED_ERROR_CODE)
  );
}
