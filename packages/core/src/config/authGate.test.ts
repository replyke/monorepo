import { describe, it, expect, vi, afterEach } from "vitest";

import {
  armAuthGate,
  syncAuthGate,
  setAuthGateRefresher,
  resetAuthGate,
  getAuthorizedToken,
} from "./authGate";

afterEach(() => {
  resetAuthGate();
  vi.restoreAllMocks();
});

/** Minimal unsigned JWT — only the payload is ever read, and only for `exp`. */
function jwtExpiringIn(seconds: number, claims: Record<string, unknown> = {}) {
  const payload = {
    sub: "user-1",
    exp: Math.floor((Date.now() + seconds * 1000) / 1000),
    ...claims,
  };
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  return `${encode({ alg: "HS256" })}.${encode(payload)}.sig`;
}

describe("authGate — disarmed", () => {
  it("returns the caller's own token verbatim, so pre-gate behavior is unchanged", async () => {
    await expect(getAuthorizedToken("token-a")).resolves.toBe("token-a");
    await expect(getAuthorizedToken(null)).resolves.toBeNull();
  });

  it("does not wait, even though no bootstrap ever ran", async () => {
    const settled = vi.fn();
    await getAuthorizedToken("token-a").then(settled);
    expect(settled).toHaveBeenCalled();
  });
});

describe("authGate — cold start", () => {
  it("holds a request until the bootstrap settles", async () => {
    armAuthGate();
    syncAuthGate({ accessToken: null, initialized: false });

    const settled = vi.fn();
    const pending = getAuthorizedToken(null).then(settled);

    // Flush pending microtasks — the gate must still be closed.
    await Promise.resolve();
    await Promise.resolve();
    expect(settled).not.toHaveBeenCalled();

    syncAuthGate({ accessToken: jwtExpiringIn(1800), initialized: true });
    await pending;
    expect(settled).toHaveBeenCalled();
  });

  it("attaches the token that ARRIVED, not the null the caller started with", async () => {
    armAuthGate();
    syncAuthGate({ accessToken: null, initialized: false });

    const token = jwtExpiringIn(1800);
    const pending = getAuthorizedToken(null);

    syncAuthGate({ accessToken: token, initialized: true });

    await expect(pending).resolves.toBe(token);
  });

  it("resolves null when the bootstrap finds nobody signed in", async () => {
    armAuthGate();
    const pending = getAuthorizedToken(null);
    syncAuthGate({ accessToken: null, initialized: true });

    await expect(pending).resolves.toBeNull();
  });

  it("opens for every subsequent request once initialized", async () => {
    armAuthGate();
    syncAuthGate({ accessToken: jwtExpiringIn(1800), initialized: true });

    const settled = vi.fn();
    await getAuthorizedToken(null).then(settled);
    expect(settled).toHaveBeenCalled();
  });

  it("stops waiting after the timeout so a stuck bootstrap cannot hang requests forever", async () => {
    armAuthGate({ timeoutMs: 10 });
    syncAuthGate({ accessToken: "stale-token", initialized: false });

    await expect(getAuthorizedToken(null)).resolves.toBe("stale-token");
  });
});

describe("authGate — pre-emptive expiry refresh", () => {
  it("rotates a token that is about to expire before the request goes out", async () => {
    const fresh = jwtExpiringIn(1800);
    const refresher = vi.fn(async () => fresh);

    armAuthGate();
    setAuthGateRefresher(refresher);
    // 30s left, inside the 60s skew.
    syncAuthGate({ accessToken: jwtExpiringIn(30), initialized: true });

    await expect(getAuthorizedToken(null)).resolves.toBe(fresh);
    expect(refresher).toHaveBeenCalledTimes(1);
  });

  it("rotates an already-expired token", async () => {
    const fresh = jwtExpiringIn(1800);
    const refresher = vi.fn(async () => fresh);

    armAuthGate();
    setAuthGateRefresher(refresher);
    syncAuthGate({ accessToken: jwtExpiringIn(-60), initialized: true });

    await expect(getAuthorizedToken(null)).resolves.toBe(fresh);
    expect(refresher).toHaveBeenCalledTimes(1);
  });

  it("leaves a healthy token alone", async () => {
    const refresher = vi.fn(async () => "should-not-be-used");
    const healthy = jwtExpiringIn(1800);

    armAuthGate();
    setAuthGateRefresher(refresher);
    syncAuthGate({ accessToken: healthy, initialized: true });

    await expect(getAuthorizedToken(null)).resolves.toBe(healthy);
    expect(refresher).not.toHaveBeenCalled();
  });

  it("rotates exactly once for a burst of requests waking together", async () => {
    let resolveRefresh!: (token: string) => void;
    const fresh = jwtExpiringIn(1800);
    const refresher = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveRefresh = resolve;
        }),
    );

    armAuthGate();
    setAuthGateRefresher(refresher);
    syncAuthGate({ accessToken: jwtExpiringIn(10), initialized: true });

    const all = Promise.all([
      getAuthorizedToken(null),
      getAuthorizedToken(null),
      getAuthorizedToken(null),
    ]);

    await Promise.resolve();
    resolveRefresh(fresh);

    await expect(all).resolves.toEqual([fresh, fresh, fresh]);
    // The server rotates the refresh token on every use with reuse detection —
    // a second concurrent rotation would present an already-spent token.
    expect(refresher).toHaveBeenCalledTimes(1);
  });

  it("falls back to the stale token when the refresh fails, leaving the reactive 403 path as backstop", async () => {
    const stale = jwtExpiringIn(10);
    const refresher = vi.fn(async () => undefined);

    armAuthGate();
    setAuthGateRefresher(refresher);
    syncAuthGate({ accessToken: stale, initialized: true });

    await expect(getAuthorizedToken(null)).resolves.toBe(stale);
  });

  it("does not touch an unparseable token — validity stays the server's call", async () => {
    const refresher = vi.fn(async () => "should-not-be-used");

    armAuthGate();
    setAuthGateRefresher(refresher);
    syncAuthGate({ accessToken: "not-a-jwt", initialized: true });

    await expect(getAuthorizedToken(null)).resolves.toBe("not-a-jwt");
    expect(refresher).not.toHaveBeenCalled();
  });

  it("does not attempt a refresh when nobody is signed in", async () => {
    const refresher = vi.fn(async () => "should-not-be-used");

    armAuthGate();
    setAuthGateRefresher(refresher);
    syncAuthGate({ accessToken: null, initialized: true });

    await expect(getAuthorizedToken(null)).resolves.toBeNull();
    expect(refresher).not.toHaveBeenCalled();
  });
});
