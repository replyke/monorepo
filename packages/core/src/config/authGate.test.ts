import { describe, it, expect, vi, afterEach } from "vitest";

import {
  armAuthGate,
  syncAuthGate,
  setAuthGateRefresher,
  resetAuthGate,
  getAuthorizedToken,
  getAuthorizedTokenForAccount,
} from "./authGate";

afterEach(() => {
  resetAuthGate();
  vi.restoreAllMocks();
});

/**
 * Bounded microtask flush. Used both to prove a call settled immediately and to
 * prove one did not — same budget on both sides, so the pair is comparable.
 */
async function flushMicrotasks(ticks = 2): Promise<void> {
  for (let i = 0; i < ticks; i++) await Promise.resolve();
}

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
    // Must NOT await: awaiting the chained promise makes `settled` run by
    // definition, and the assertion holds however long the gate blocked. The
    // same two-flush budget the "holds" tests use to prove the opposite.
    void getAuthorizedToken("token-a").then(settled);

    await flushMicrotasks();

    expect(settled).toHaveBeenCalled();
  });
});

describe("authGate — cold start", () => {
  it("holds a request until the bootstrap settles", async () => {
    armAuthGate();
    syncAuthGate({ accessToken: null, initialized: false });

    const settled = vi.fn();
    const pending = getAuthorizedToken(null).then(settled);

    // Same budget as the immediacy tests above — the gate must still be closed.
    await flushMicrotasks();
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
    void getAuthorizedToken(null).then(settled);

    await flushMicrotasks();

    expect(settled).toHaveBeenCalled();
  });

  it("stops waiting after the timeout so a stuck bootstrap cannot hang requests forever", async () => {
    armAuthGate({ timeoutMs: 10 });
    syncAuthGate({ accessToken: "stale-token", initialized: false });

    await expect(getAuthorizedToken(null)).resolves.toBe("stale-token");
  });
});

describe("authGate — re-bootstrap (account switch / partial sign-out)", () => {
  it("re-closes when `initialized` goes back to false", async () => {
    // `signOutThunk`/`confirmAccountDeletionThunk` drive
    // setTokens(accessToken: null) -> setInitialized(false) -> rotate ->
    // setInitialized(true) when another account remains, and
    // `useSwitchAccount` dispatches `resetApiState()` across that window, which
    // forces every mounted RTK query to refetch. Those refetches must wait, or
    // they cache the outgoing account's stranger-data against the incoming one.
    armAuthGate();
    syncAuthGate({ accessToken: jwtExpiringIn(1800), initialized: true });

    // Re-bootstrap begins: token cleared, initialized withdrawn.
    syncAuthGate({ accessToken: null, initialized: false });

    const settled = vi.fn();
    const pending = getAuthorizedToken(null);
    void pending.then(settled);

    await flushMicrotasks();
    expect(settled).not.toHaveBeenCalled();

    const incoming = jwtExpiringIn(1800);
    syncAuthGate({ accessToken: incoming, initialized: true });

    await expect(pending).resolves.toBe(incoming);
  });

  it("still bounds a re-closed gate by the timeout", async () => {
    armAuthGate({ timeoutMs: 10 });
    syncAuthGate({ accessToken: "first", initialized: true });
    syncAuthGate({ accessToken: "second", initialized: false });

    await expect(getAuthorizedToken(null)).resolves.toBe("second");
  });
});

describe("authGate — SSR", () => {
  it("refuses to arm when there is no window", async () => {
    // Module state is process-global on a Node server and effects never run
    // there, so an armed-but-never-opened gate would stall every subsequent
    // request in that process for the full timeout.
    vi.stubGlobal("window", undefined);
    try {
      armAuthGate();
      // Disarmed: returns the caller's own token, immediately.
      await expect(getAuthorizedToken("ssr-token")).resolves.toBe("ssr-token");
    } finally {
      vi.unstubAllGlobals();
    }
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

  it("attempts a stale token only once, not once per request", async () => {
    // A revoked refresh token would otherwise turn every outbound request into
    // an extra failed rotation round trip plus an error log, because the held
    // token still reads as expiring.
    const refresher = vi.fn(async () => undefined);
    const stale = jwtExpiringIn(10);

    armAuthGate();
    setAuthGateRefresher(refresher);
    syncAuthGate({ accessToken: stale, initialized: true });

    for (let i = 0; i < 5; i++) {
      await expect(getAuthorizedToken(null)).resolves.toBe(stale);
    }

    expect(refresher).toHaveBeenCalledTimes(1);
  });

  it("retries once a new token arrives after a failed rotation", async () => {
    const refresher = vi.fn(async () => undefined);
    const stale = jwtExpiringIn(10);

    armAuthGate();
    setAuthGateRefresher(refresher);
    syncAuthGate({ accessToken: stale, initialized: true });
    await getAuthorizedToken(null);
    expect(refresher).toHaveBeenCalledTimes(1);

    // A different stale token (e.g. after a manual sign-in) is a fresh subject.
    syncAuthGate({ accessToken: jwtExpiringIn(20), initialized: true });
    await getAuthorizedToken(null);
    expect(refresher).toHaveBeenCalledTimes(2);
  });

  it("stops rotating when a freshly minted token still reads as expiring", async () => {
    // A skewed local clock makes every valid 30-minute token look stale. Left
    // undamped, every request would rotate a perfectly good refresh token
    // against a server that does reuse detection.
    const refresher = vi.fn(async () => jwtExpiringIn(10));

    armAuthGate();
    setAuthGateRefresher(refresher);
    syncAuthGate({ accessToken: jwtExpiringIn(10), initialized: true });

    for (let i = 0; i < 5; i++) {
      await getAuthorizedToken(null);
    }

    expect(refresher).toHaveBeenCalledTimes(1);
  });

  it("treats a REJECTING refresher as a failed rotation, not a failed request", async () => {
    // Unguarded, the rejection propagates out of `getAuthorizedToken` and
    // rejects the axios REQUEST interceptor — killing the request before it is
    // sent, which is strictly worse than the pre-gate behaviour where a refresh
    // failure only cost one retry. No refresher rejects today, but all three
    // callers share this single-flight promise, so one `.unwrap()` added
    // anywhere would fail every request in the app.
    const refresher = vi.fn(async () => {
      throw new Error("refresh endpoint exploded");
    });
    const stale = jwtExpiringIn(10);

    armAuthGate();
    setAuthGateRefresher(refresher);
    syncAuthGate({ accessToken: stale, initialized: true });

    await expect(getAuthorizedToken(null)).resolves.toBe(stale);
    expect(refresher).toHaveBeenCalledTimes(1);
  });

  it("damps a rejecting refresher the same way it damps a failing one", async () => {
    const refresher = vi.fn(async () => {
      throw new Error("refresh endpoint exploded");
    });

    armAuthGate();
    setAuthGateRefresher(refresher);
    syncAuthGate({ accessToken: jwtExpiringIn(10), initialized: true });

    for (let i = 0; i < 3; i++) await getAuthorizedToken(null);

    expect(refresher).toHaveBeenCalledTimes(1);
  });

  it("re-enables rotation once a healthy token proves the clock is right again", async () => {
    // `clockUnreliable` otherwise latches for the process lifetime, so a device
    // whose clock was wrong at launch and has since been corrected would stay
    // on the reactive-403 path — the one path that does not work on
    // `optionalUserAuth` routes.
    const skewed = vi.fn(async () => jwtExpiringIn(10));

    armAuthGate();
    setAuthGateRefresher(skewed);
    syncAuthGate({ accessToken: jwtExpiringIn(10), initialized: true });

    await getAuthorizedToken(null);
    await getAuthorizedToken(null);
    expect(skewed).toHaveBeenCalledTimes(1); // latched off

    // Clock corrected: a new token now reads as healthy.
    syncAuthGate({ accessToken: jwtExpiringIn(1800), initialized: true });

    // ...and rotation works again for the next token that genuinely ages out.
    const fresh = jwtExpiringIn(1800);
    const healthy = vi.fn(async () => fresh);
    setAuthGateRefresher(healthy);
    syncAuthGate({ accessToken: jwtExpiringIn(10), initialized: true });

    await expect(getAuthorizedToken(null)).resolves.toBe(fresh);
    expect(healthy).toHaveBeenCalledTimes(1);
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

describe("getAuthorizedTokenForAccount", () => {
  // Used by callers whose request is a WRITE — the account-management thunks and
  // the OAuth link call. Waiting at the gate makes the read and the send
  // non-atomic, and for those callers resuming under a switched identity is a
  // write to an account the caller never chose, not merely stale data.
  it("throws when the token that arrives belongs to a different account", async () => {
    const startedWith = jwtExpiringIn(1800, { sub: "user-1" });

    armAuthGate();
    syncAuthGate({ accessToken: startedWith, initialized: true });
    syncAuthGate({ accessToken: null, initialized: false });

    const pending = getAuthorizedTokenForAccount(startedWith);
    syncAuthGate({
      accessToken: jwtExpiringIn(1800, { sub: "user-2" }),
      initialized: true,
    });

    await expect(pending).rejects.toThrow(/active account changed/i);
  });

  it("allows a rotation of the same account through", async () => {
    // A pre-emptive rotation mints a new token STRING for the same `sub`. If
    // that read as a switch, every idle-expiry recovery would break.
    const expired = jwtExpiringIn(-60, { sub: "user-1" });
    const rotated = jwtExpiringIn(1800, { sub: "user-1" });

    armAuthGate();
    setAuthGateRefresher(async () => rotated);
    syncAuthGate({ accessToken: expired, initialized: true });

    await expect(getAuthorizedTokenForAccount(expired)).resolves.toBe(rotated);
  });

  it("allows a cold start through, where there is no starting identity", async () => {
    // The caller holds null while the bootstrap is in flight — the very case the
    // wait exists for. Nothing to compare, so it must not block.
    armAuthGate();
    syncAuthGate({ accessToken: null, initialized: false });

    const pending = getAuthorizedTokenForAccount(null);
    const arrived = jwtExpiringIn(1800, { sub: "user-1" });
    syncAuthGate({ accessToken: arrived, initialized: true });

    await expect(pending).resolves.toBe(arrived);
  });

  it("allows an unreadable `sub` through rather than treating it as a mismatch", async () => {
    // Consistent with the rest of the module: unreadable means "don't know".
    armAuthGate();
    syncAuthGate({ accessToken: "opaque-token", initialized: true });

    await expect(getAuthorizedTokenForAccount("also-opaque")).resolves.toBe(
      "opaque-token",
    );
  });

  it("is a no-op passthrough while disarmed", async () => {
    await expect(getAuthorizedTokenForAccount("token-a")).resolves.toBe("token-a");
  });
});
