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
 * 30 seconds, chosen for the slowest legitimate caller rather than the fastest.
 * Everything on this instance is a short control-plane call — sign-in, sign-up,
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

export const axiosPrivate = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});
