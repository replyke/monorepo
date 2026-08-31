import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";

import {
  makeSublayStore,
  mockAxiosPublic,
  resetAxiosMocks,
  type SublayStore,
} from "../../test-utils";
import {
  setAccountMap,
  setDeviceIdentifier,
  setAccountNeedsPushRebind,
  setAccountPushEnabled,
  type AccountEntry,
  type AccountMap,
} from "../../store/slices/accountsSlice";
import { setTokens } from "../../store/slices/authSlice";
import {
  registerAccountStorage,
  resetAccountStorage,
} from "../../config/accountStorage";
import { resetAccountTokenMints } from "./mintAccountAccessToken";
import {
  applyAccountPushBinding,
  reconcileAccountPushBinding,
  markPushBindingsForRebind,
  pushIdentifiersEqual,
} from "./reconcilePushBindings";

let store: SublayStore;

const DEVICE = { platform: "ios" as const, token: "device-token-1" };

// The four states that matter, and the fixture carries one account in each:
//
//   user-1  active,     explicitly enabled
//   user-2  background, explicitly enabled
//   user-3  background, explicitly SILENCED
//   user-4  background, NEVER ASKED (absent preference — an entry written
//           before the flag existed, or an account that just signed in)
function makeAccounts(): Record<string, AccountEntry> {
  return {
    "user-1": {
      refreshToken: "refresh-1",
      tokenExpiresAt: 0,
      user: { id: "user-1", name: null, email: null, avatar: null },
      pushEnabled: true,
    },
    "user-2": {
      refreshToken: "refresh-2",
      tokenExpiresAt: 0,
      user: { id: "user-2", name: null, email: null, avatar: null },
      pushEnabled: true,
    },
    "user-3": {
      refreshToken: "refresh-3",
      tokenExpiresAt: 0,
      user: { id: "user-3", name: null, email: null, avatar: null },
      pushEnabled: false,
    },
    "user-4": {
      refreshToken: "refresh-4",
      tokenExpiresAt: 0,
      user: { id: "user-4", name: null, email: null, avatar: null },
    },
  };
}

function seed({ withDevice = true }: { withDevice?: boolean } = {}) {
  store = makeSublayStore();
  store.dispatch(
    setAccountMap({
      activeAccountId: "user-1",
      accounts: makeAccounts(),
      deviceIdentifier: withDevice ? DEVICE : null,
    }),
  );
  store.dispatch(setTokens({ accessToken: "access-1", refreshToken: "refresh-1" }));
}

const ctx = () => ({
  dispatch: store.dispatch as never,
  getState: () => store.getState(),
  projectId: "test-project",
});

let written: AccountMap[];

beforeEach(() => {
  seed();
  resetAccountTokenMints();
  written = [];
  registerAccountStorage(
    {
      getAccountMap: vi.fn().mockResolvedValue(null),
      setAccountMap: vi.fn(async (_projectId: string, map: AccountMap) => {
        // Structured-clone-ish snapshot: the slice mutates in place, so holding
        // the reference would let a later dispatch rewrite "what was written".
        written.push(JSON.parse(JSON.stringify(map)));
      }),
      deleteAccountMap: vi.fn().mockResolvedValue(undefined),
    },
    "test-project",
  );
});

/** The last map that actually reached storage. */
const lastWritten = () => written[written.length - 1];

afterEach(() => {
  resetAxiosMocks();
  resetAccountStorage();
  resetAccountTokenMints();
});

describe("pushIdentifiersEqual", () => {
  it("compares native tokens and web subscriptions structurally", () => {
    expect(pushIdentifiersEqual(DEVICE, { ...DEVICE })).toBe(true);
    expect(
      pushIdentifiersEqual(DEVICE, { platform: "ios", token: "other" }),
    ).toBe(false);
    expect(pushIdentifiersEqual(null, null)).toBe(true);
    expect(pushIdentifiersEqual(DEVICE, null)).toBe(false);

    const web = {
      platform: "web" as const,
      subscription: { endpoint: "e", keys: { p256dh: "p", auth: "a" } },
    };
    expect(pushIdentifiersEqual(web, { ...web })).toBe(true);
    // Same endpoint, re-issued keys — still a different subscription.
    expect(
      pushIdentifiersEqual(web, {
        platform: "web",
        subscription: { endpoint: "e", keys: { p256dh: "p2", auth: "a" } },
      }),
    ).toBe(false);
  });
});

describe("reconcileAccountPushBinding", () => {
  it("registers the ACTIVE account with its live token and never mints", async () => {
    const axiosPublic = mockAxiosPublic();
    axiosPublic.mockResponse("post", {});

    await reconcileAccountPushBinding(ctx(), "user-1");

    const posts = axiosPublic.calls("post");
    expect(posts).toHaveLength(1);
    expect(posts[0].url).toBe("/test-project/push-notifications/devices");
    expect(posts[0].body).toEqual(DEVICE);
    expect(posts[0].config?.headers.Authorization).toBe("Bearer access-1");
    // No token exchange happened — the one request was the device POST.
    expect(
      posts.some((c) => c.url.includes("request-new-access-token")),
    ).toBe(false);
  });

  it("deregisters a silenced account, minting for it because it is not active", async () => {
    const axiosPublic = mockAxiosPublic();
    axiosPublic.mockResponse("post", {
      accessToken: "access-3",
      refreshToken: "refresh-3-successor",
    });
    axiosPublic.mockResponse("delete", {});

    await reconcileAccountPushBinding(ctx(), "user-3");

    const [mint] = axiosPublic.calls("post");
    expect(mint.url).toBe("/test-project/auth/request-new-access-token");
    expect(mint.body).toEqual({ refreshToken: "refresh-3" });

    const [del] = axiosPublic.calls("delete");
    expect(del.url).toBe("/test-project/push-notifications/devices");
    expect(del.config?.data).toEqual(DEVICE);
    expect(del.config?.headers.Authorization).toBe("Bearer access-3");
  });

  it("survives the token rotation that rebuilds the entry — the account stays silenced", async () => {
    const axiosPublic = mockAxiosPublic();
    axiosPublic.mockResponse("post", {
      accessToken: "access-3",
      refreshToken: "refresh-3-successor",
    });
    axiosPublic.mockResponse("delete", {});

    await reconcileAccountPushBinding(ctx(), "user-3");

    expect(store.getState().sublay.accounts.accounts["user-3"]).toMatchObject({
      refreshToken: "refresh-3-successor",
      pushEnabled: false,
    });
  });

  it("is a clean no-op when no device identifier is stored", async () => {
    seed({ withDevice: false });
    const axiosPublic = mockAxiosPublic();

    await reconcileAccountPushBinding(ctx(), "user-1");
    await markPushBindingsForRebind(ctx());

    expect(axiosPublic.calls("post")).toHaveLength(0);
    expect(axiosPublic.calls("delete")).toHaveLength(0);
  });

  it("is a no-op for an unknown account", async () => {
    const axiosPublic = mockAxiosPublic();
    await reconcileAccountPushBinding(ctx(), "user-missing");
    expect(axiosPublic.calls("post")).toHaveLength(0);
  });
});

describe("applyAccountPushBinding", () => {
  it("takes the desired value explicitly, ignoring the stored flag", async () => {
    const axiosPublic = mockAxiosPublic();
    axiosPublic.mockResponse("post", {
      accessToken: "access-3",
      refreshToken: "refresh-3-successor",
    });
    axiosPublic.mockResponse("post", {});

    // user-3 is stored as DISABLED; the toggle turning it on must bind before
    // the flag is written.
    await applyAccountPushBinding(ctx(), "user-3", true);

    const posts = axiosPublic.calls("post");
    expect(posts[1].url).toBe("/test-project/push-notifications/devices");
    // The flag itself is untouched — writing it is the caller's job, and only
    // after this resolved.
    expect(
      store.getState().sublay.accounts.accounts["user-3"].pushEnabled,
    ).toBe(false);
  });
});

describe("markPushBindingsForRebind", () => {
  it("MARKS every opted-in background account instead of exchanging its credential", async () => {
    const axiosPublic = mockAxiosPublic();
    // ONE response only: the active account's device POST. If anything here
    // starts a token exchange it falls through to the real, un-mocked axios and
    // the request assertions below say exactly what went out.
    axiosPublic.mockResponse("post", {});

    await markPushBindingsForRebind(ctx());

    // ⚠ THE LOAD-BEARING ASSERTION, and it is on the REQUESTS rather than on a
    // mock's call count: the bulk loop this replaces traded each background
    // account's stored refresh token for a temporary session, and that trade is
    // one-time-use — interrupted, it locks the account out for good. A test
    // that only checked "the loop function was not called" would pass against a
    // rewritten loop that still exchanged.
    const posts = axiosPublic.calls("post");
    expect(
      posts.filter((c) => c.url.includes("request-new-access-token")),
    ).toHaveLength(0);
    expect(
      posts.some(
        (c) =>
          c.body &&
          typeof (c.body as { refreshToken?: string }).refreshToken === "string",
      ),
    ).toBe(false);

    const accounts = store.getState().sublay.accounts.accounts;
    expect(accounts["user-2"].needsPushRebind).toBe(true);
  });

  it("re-binds the ACTIVE account on the spot, and does not mark it", async () => {
    const axiosPublic = mockAxiosPublic();
    axiosPublic.mockResponse("post", {});

    await markPushBindingsForRebind(ctx());

    const devicePosts = axiosPublic
      .calls("post")
      .filter((c) => c.url.includes("push-notifications/devices"));
    // Exactly one, and it is the active account's — free, because its session is
    // already live and `resolveAccessToken` never reaches the mint for it.
    expect(devicePosts).toHaveLength(1);
    expect(devicePosts[0].body).toEqual(DEVICE);
    expect(devicePosts[0].config?.headers.Authorization).toBe("Bearer access-1");
    expect(
      store.getState().sublay.accounts.accounts["user-1"].needsPushRebind,
    ).toBeUndefined();
  });

  it("marks NEITHER a silenced account nor one that never expressed a preference", async () => {
    const axiosPublic = mockAxiosPublic();
    axiosPublic.mockResponse("post", {});

    await markPushBindingsForRebind(ctx());

    const accounts = store.getState().sublay.accounts.accounts;
    // Silenced: it was unbound when it was silenced, so there is nothing to
    // repair — and marking it would surface "notifications paused" on an
    // account the user deliberately turned off.
    expect(accounts["user-3"].needsPushRebind).toBeUndefined();
    // Never asked: absent is not consent. Marking it would raise a marker that
    // the activation path — which applies the same explicit-preference rule —
    // would never clear, leaving "open to resume" on an account that opening
    // does not fix.
    expect(accounts["user-4"].needsPushRebind).toBeUndefined();
    expect(axiosPublic.calls("delete")).toHaveLength(0);
  });

  it("persists the marks, because the repair may be several launches away", async () => {
    const axiosPublic = mockAxiosPublic();
    axiosPublic.mockResponse("post", {});

    await markPushBindingsForRebind(ctx());

    // Named first so a mutation that simply stops persisting fails on "nothing
    // reached storage" rather than on a property read of `undefined`.
    expect(written.length).toBeGreaterThan(0);
    expect(lastWritten().accounts["user-2"].needsPushRebind).toBe(true);
    expect(lastWritten().accounts["user-4"].needsPushRebind).toBeUndefined();
  });

  it("still records the marks when the active account's re-bind fails", async () => {
    const axiosPublic = mockAxiosPublic();
    axiosPublic.mockError("post", 500, { message: "nope" });

    await expect(markPushBindingsForRebind(ctx())).resolves.toBeUndefined();

    // One failed request for the account the user is looking at must not lose
    // the record of what the other accounts need.
    expect(
      store.getState().sublay.accounts.accounts["user-2"].needsPushRebind,
    ).toBe(true);
    expect(written.length).toBeGreaterThan(0);
    expect(lastWritten().accounts["user-2"].needsPushRebind).toBe(true);
  });

  it("MARKS the active account when its own re-bind fails, so it is not silently quiet", async () => {
    // The one account with no self-healing loop and no visible marker used to
    // be the one the user is looking at: it is skipped by the marking loop (it
    // is re-bound instead), and a failed re-bind was only logged. The feature's
    // promise is that an account does not go quietly silent.
    const axiosPublic = mockAxiosPublic();
    axiosPublic.mockError("post", 500, { message: "nope" });

    await expect(markPushBindingsForRebind(ctx())).resolves.toBeUndefined();

    expect(
      store.getState().sublay.accounts.accounts["user-1"].needsPushRebind,
    ).toBe(true);
    // Durable: the repair happens on a later reconcile, which may be launches
    // away, so the mark has to reach storage like every other one.
    expect(written.length).toBeGreaterThan(0);
    expect(lastWritten().accounts["user-1"].needsPushRebind).toBe(true);
  });

  it("clears the active account's mark once a later re-bind succeeds", async () => {
    // The other half: a mark that could only ever be raised would leave
    // "notifications paused" standing on an account that has since repaired
    // itself.
    store.dispatch(
      setAccountNeedsPushRebind({ userId: "user-1", needsRebind: true }),
    );
    const axiosPublic = mockAxiosPublic();
    axiosPublic.mockResponse("post", {});

    await markPushBindingsForRebind(ctx());

    expect(
      store.getState().sublay.accounts.accounts["user-1"].needsPushRebind,
    ).toBeUndefined();
    expect(written.length).toBeGreaterThan(0);
    expect(lastWritten().accounts["user-1"].needsPushRebind).toBeUndefined();
  });

  it("restricted to named accounts, marks only those — for a repeat register() on an unchanged token", async () => {
    const axiosPublic = mockAxiosPublic();
    axiosPublic.mockResponse("post", {});

    // `user-4` is the shape `register()` produces: an absent preference it has
    // just flipped to enabled, with no binding behind it. `user-2` was already
    // enabled and already bound to this same identifier, so it is working and
    // must not be told otherwise.
    store.dispatch(
      setAccountPushEnabled({ userId: "user-4", enabled: true }),
    );

    await markPushBindingsForRebind(ctx(), { accountIds: ["user-4"] });

    const accounts = store.getState().sublay.accounts.accounts;
    expect(accounts["user-4"].needsPushRebind).toBe(true);
    expect(accounts["user-2"].needsPushRebind).toBeUndefined();
    expect(accounts["user-3"].needsPushRebind).toBeUndefined();
  });

  it("restricted to named accounts, does NOT re-POST for the active account", async () => {
    // The restriction governs the active account too. A narrow call only ever
    // comes from a repeat `register()` on an unchanged identifier, and that
    // call has already bound the active account itself — so a request here is
    // work nobody asked for. (Idempotent, so never a live bug; it read as half
    // the loop's rule being forgotten.)
    const axiosPublic = mockAxiosPublic();
    axiosPublic.mockResponse("post", {});

    store.dispatch(setAccountPushEnabled({ userId: "user-4", enabled: true }));

    await markPushBindingsForRebind(ctx(), { accountIds: ["user-4"] });

    expect(axiosPublic.calls("post")).toHaveLength(0);
  });

  it("restricted, still re-binds the active account when it is CARRYING A MARK", async () => {
    // The one exception, and the reason this is not a bare membership test: the
    // mark comes off only after a bind resolves, so skipping the request would
    // leave the account the user is looking at reporting "notifications paused"
    // with nothing left able to clear it.
    const axiosPublic = mockAxiosPublic();
    axiosPublic.mockResponse("post", {});

    store.dispatch(setAccountPushEnabled({ userId: "user-4", enabled: true }));
    store.dispatch(
      setAccountNeedsPushRebind({ userId: "user-1", needsRebind: true }),
    );

    await markPushBindingsForRebind(ctx(), { accountIds: ["user-4"] });

    expect(axiosPublic.calls("post")).toHaveLength(1);
    expect(
      store.getState().sublay.accounts.accounts["user-1"].needsPushRebind,
    ).toBeUndefined();
  });

  it("unrestricted, DOES re-bind the active account — the identifier really changed", async () => {
    const axiosPublic = mockAxiosPublic();
    axiosPublic.mockResponse("post", {});

    await markPushBindingsForRebind(ctx());

    expect(axiosPublic.calls("post")).toHaveLength(1);
  });
  it("is a clean no-op when no device identifier is stored", async () => {
    seed({ withDevice: false });
    const axiosPublic = mockAxiosPublic();

    await markPushBindingsForRebind(ctx());

    expect(axiosPublic.calls("post")).toHaveLength(0);
    expect(
      store.getState().sublay.accounts.accounts["user-2"].needsPushRebind,
    ).toBeUndefined();
  });
});

describe("the re-bind marker's lifecycle", () => {
  it("is cleared, durably, when the account is next activated and re-bound", async () => {
    store.dispatch(
      setAccountNeedsPushRebind({ userId: "user-1", needsRebind: true }),
    );
    const axiosPublic = mockAxiosPublic();
    axiosPublic.mockResponse("post", {});

    await reconcileAccountPushBinding(ctx(), "user-1");

    // The binding was actually re-created — the mark does not clear on its own.
    expect(
      axiosPublic
        .calls("post")
        .filter((c) => c.url.includes("push-notifications/devices")),
    ).toHaveLength(1);
    expect(
      store.getState().sublay.accounts.accounts["user-1"].needsPushRebind,
    ).toBeUndefined();
    expect(lastWritten().accounts["user-1"].needsPushRebind).toBeUndefined();
  });

  it("SURVIVES a failed re-bind, so the next activation tries again", async () => {
    store.dispatch(
      setAccountNeedsPushRebind({ userId: "user-1", needsRebind: true }),
    );
    const axiosPublic = mockAxiosPublic();
    axiosPublic.mockError("post", 500, { message: "nope" });

    await expect(reconcileAccountPushBinding(ctx(), "user-1")).rejects.toBeTruthy();

    expect(
      store.getState().sublay.accounts.accounts["user-1"].needsPushRebind,
    ).toBe(true);
  });

  it("SURVIVES a resolved no-op, because a pass that made no request repaired nothing", async () => {
    // The third outcome, and the one that used to clear the marker: with NO
    // device identifier `applyAccountPushBinding` resolves WITHOUT a request,
    // so nothing was bound or unbound. Gating the clear on "did the marker
    // exist" rather than "did a binding change" reported a repair that never
    // happened — and took away the account's only route back, since this path
    // and the toggle are the two clearing points and both are no-ops until an
    // identifier exists.
    //
    // Seeded through `setAccountMap`, like the sibling case in
    // `useAccountPushToggle.test.ts`: the public API cannot currently produce
    // this pair (every writer of the marker is gated on an identifier being
    // present, and nothing nulls one back out), but hydration writes a
    // persisted identifier verbatim with no cross-check against the markers.
    store = makeSublayStore();
    store.dispatch(
      setAccountMap({
        activeAccountId: "user-1",
        accounts: {
          ...makeAccounts(),
          "user-1": { ...makeAccounts()["user-1"], needsPushRebind: true },
        },
        // No identifier: this device has never registered.
        deviceIdentifier: null,
      }),
    );
    store.dispatch(
      setTokens({ accessToken: "access-1", refreshToken: "refresh-1" }),
    );
    const axiosPublic = mockAxiosPublic();

    await reconcileAccountPushBinding(ctx(), "user-1");

    // Nothing went out — not the device call, not a mint.
    expect(axiosPublic.calls("post")).toHaveLength(0);
    expect(axiosPublic.calls("delete")).toHaveLength(0);
    // ...so the claim the marker makes about server state is still true.
    expect(
      store.getState().sublay.accounts.accounts["user-1"].needsPushRebind,
    ).toBe(true);
  });

  it("clears when a silenced account is activated and its binding removed", async () => {
    store.dispatch(
      setAccountNeedsPushRebind({ userId: "user-3", needsRebind: true }),
    );
    const axiosPublic = mockAxiosPublic();
    axiosPublic.mockResponse("post", {
      accessToken: "access-3",
      refreshToken: "refresh-3-successor",
    });
    axiosPublic.mockResponse("delete", {});

    await reconcileAccountPushBinding(ctx(), "user-3");

    // Its intent is now matched by the server, so there is nothing left to
    // repair — and leaving the marker would report paused notifications on an
    // account the user silenced on purpose.
    expect(
      store.getState().sublay.accounts.accounts["user-3"].needsPushRebind,
    ).toBeUndefined();
  });
});

describe("reconcileAccountPushBinding — explicit preference required", () => {
  it("leaves an account that never expressed a preference completely alone", async () => {
    const axiosPublic = mockAxiosPublic();
    // Queued up front, deliberately: user-4 is not the active account, so if
    // the absent case ever starts binding again it MINTS first. Without these
    // the mutation blows up on an un-mocked request instead of failing on the
    // assertion that names the behavior, and a mutation should be legible.
    axiosPublic.mockResponse("post", {
      accessToken: "access-4",
      refreshToken: "refresh-4-successor",
    });
    axiosPublic.mockResponse("post", {});
    axiosPublic.mockResponse("delete", {});

    await reconcileAccountPushBinding(ctx(), "user-4");

    // Not bound: on a shared device the identifier deliberately survives a
    // sign-out-all, so binding on absent means the next person to sign in is
    // push-bound having granted nothing and with the app never calling
    // `register()`.
    expect(axiosPublic.calls("post")).toHaveLength(0);
    // ...and not UNBOUND either. Absent is "never asked", not "turn it off" —
    // an upgrading install's working binding must not be torn down.
    expect(axiosPublic.calls("delete")).toHaveLength(0);
  });

  it("still binds an account that explicitly enabled push", async () => {
    const axiosPublic = mockAxiosPublic();
    axiosPublic.mockResponse("post", {});

    await reconcileAccountPushBinding(ctx(), "user-1");

    expect(
      axiosPublic
        .calls("post")
        .filter((c) => c.url.includes("push-notifications/devices")),
    ).toHaveLength(1);
  });
});
