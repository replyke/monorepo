import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
  makeRtkQueryStore,
  stubFetchMock,
  unstubFetchMock,
  jsonResponse,
  type FetchMockHandle,
  type RtkQueryStore,
} from "../../test-utils";
import {
  armAuthGate,
  syncAuthGate,
  setAuthGateRefresher,
  resetAuthGate,
} from "../../config/authGate";
import { setTokens, setInitialized } from "../slices/authSlice";
import { userApi } from "./userApi";

let fetchHandle: FetchMockHandle;
let store: RtkQueryStore;

beforeEach(() => {
  fetchHandle = stubFetchMock(async () => jsonResponse({ id: "user-1" }));
  store = makeRtkQueryStore();
});

afterEach(() => {
  unstubFetchMock();
  resetAuthGate();
  vi.restoreAllMocks();
});

/** Minimal unsigned JWT — only `exp` is ever read from it. */
function jwtExpiringIn(seconds: number) {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  return `${encode({ alg: "HS256" })}.${encode({
    sub: "user-1",
    exp: Math.floor((Date.now() + seconds * 1000) / 1000),
  })}.sig`;
}

function authHeaderOfCall(index: number): string | null {
  const req = fetchHandle.fetchMock.mock.calls[index]?.[0] as {
    headers?: Headers;
  };
  const headers = req?.headers;
  if (!headers) return null;
  return typeof headers.get === "function"
    ? headers.get("Authorization")
    : null;
}

function dispatchFetchUser() {
  return store.dispatch(
    userApi.endpoints.updateUser.initiate({
      projectId: "test-project",
      userId: "user-1",
      update: { name: "New" },
    }),
  );
}

describe("baseApi prepareHeaders — auth gate", () => {
  it("sends no Authorization header when the gate is disarmed and the store has no token", async () => {
    // Unchanged pre-gate behavior: nothing armed, so nothing waits.
    await dispatchFetchUser();
    expect(authHeaderOfCall(0)).toBeNull();
  });

  it("uses the store token verbatim when the gate is disarmed", async () => {
    store.dispatch(setTokens({ accessToken: "token-a" }));

    await dispatchFetchUser();
    expect(authHeaderOfCall(0)).toBe("Bearer token-a");
  });

  it("holds the query until the bootstrap lands, then sends the ARRIVED token", async () => {
    // Without this, RTK Query caches the stranger-response under an args-only
    // key and never refetches when the token lands, because the args never
    // changed.
    armAuthGate();
    syncAuthGate({ accessToken: null, initialized: false });

    const inFlight = dispatchFetchUser();

    await Promise.resolve();
    await Promise.resolve();
    expect(fetchHandle.fetchMock).not.toHaveBeenCalled();

    const token = jwtExpiringIn(1800);
    store.dispatch(setTokens({ accessToken: token }));
    store.dispatch(setInitialized(true));
    syncAuthGate({ accessToken: token, initialized: true });

    await inFlight;

    expect(fetchHandle.fetchMock).toHaveBeenCalledTimes(1);
    expect(authHeaderOfCall(0)).toBe(`Bearer ${token}`);
  });

  it("sends no Authorization header once the bootstrap confirms nobody is signed in", async () => {
    armAuthGate();
    const inFlight = dispatchFetchUser();
    syncAuthGate({ accessToken: null, initialized: true });

    await inFlight;
    expect(authHeaderOfCall(0)).toBeNull();
  });

  it("rotates a near-expiry token before the query leaves", async () => {
    const fresh = jwtExpiringIn(1800);
    const refresher = vi.fn(async () => fresh);

    armAuthGate();
    setAuthGateRefresher(refresher);
    syncAuthGate({ accessToken: jwtExpiringIn(-60), initialized: true });

    await dispatchFetchUser();

    expect(refresher).toHaveBeenCalledTimes(1);
    expect(authHeaderOfCall(0)).toBe(`Bearer ${fresh}`);
  });
});
