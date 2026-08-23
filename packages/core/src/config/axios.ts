import axios from "axios";

export const BASE_URL = "https://api.sublay.io/v7";

/**
 * How long a request may go unanswered before it is abandoned.
 *
 * Without one, a connection that is accepted and then never answered — a dead
 * mobile link, a load balancer holding an idle socket — leaves the promise
 * pending forever. On the credential-exchange path
 * (`hooks/push/mintAccountAccessToken`) that is not merely a slow request: the
 * in-flight entry is only evicted when the exchange SETTLES, so a hung one is
 * never evicted, every later exchange for that account joins the same dead
 * promise, and the lease is never released. The switch spinner never stops and
 * that account cannot be switched into again without an app restart.
 *
 * APPLIED TO THE DEFAULT (PUBLIC) INSTANCE ONLY. `axiosPrivate` below is
 * deliberately untimed, for a reason spelled out there.
 *
 * 30 seconds, chosen for the slowest legitimate caller rather than the fastest.
 * Everything on the public instance is a short control-plane call — sign-in, sign-up,
 * sign-out, the token exchange, password reset, email verification, the lean
 * project fetch, a username availability check, push device register/deregister
 * — with no uploads and no streaming. The slowest of those still does real work
 * behind the request (password hashing, an outbound email, a cold serverless
 * start), so the ceiling is set several times above what any of them should
 * take: this exists to convert "never" into "eventually", not to police
 * latency.
 */
export const REQUEST_TIMEOUT_MS = 30_000;

export default axios.create({
  baseURL: BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
});

/**
 * The authenticated instance — and DELIBERATELY WITHOUT `REQUEST_TIMEOUT_MS`.
 *
 * Read the comment above as scoped, not as a rule this instance failed to
 * follow. The 30-second ceiling is justified there by "everything on this
 * instance is a short control-plane call ... with no uploads and no streaming",
 * and that is precisely what is NOT true here: this instance carries the
 * multipart paths — file and image upload, message send, entity and event
 * create/update, space create/update, profile update — where the request body
 * is a user-chosen file being pushed over a mobile link.
 *
 * An axios `timeout` is a whole-request deadline, not an idle one, so a blanket
 * value here would abort large uploads that are progressing perfectly well; the
 * only way to pick one that never did would be to pick one so large it stopped
 * meaning anything. The hazard the public instance's timeout exists for — a hung
 * promise that is never evicted, poisoning a shared in-flight entry — is
 * specific to the credential-exchange path, which lives on that instance.
 *
 * If a request on THIS instance ever needs a deadline, give it a per-request
 * `timeout` (or an `AbortSignal`) at the call site, where the caller knows
 * whether it is sending a JSON body or a 40 MB video.
 */
export const axiosPrivate = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});
