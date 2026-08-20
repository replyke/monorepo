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
  type AccountEntry,
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
  reconcileAllPushBindings,
  pushIdentifiersEqual,
} from "./reconcilePushBindings";

let store: SublayStore;

const DEVICE = { platform: "ios" as const, token: "device-token-1" };

function makeAccounts(): Record<string, AccountEntry> {
  return {
    "user-1": {
      refreshToken: "refresh-1",
      tokenExpiresAt: 0,
      user: { id: "user-1", name: null, email: null, avatar: null },
    },
    "user-2": {
      refreshToken: "refresh-2",
      tokenExpiresAt: 0,
      user: { id: "user-2", name: null, email: null, avatar: null },
    },
    "user-3": {
      refreshToken: "refresh-3",
      tokenExpiresAt: 0,
      user: { id: "user-3", name: null, email: null, avatar: null },
      pushEnabled: false,
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

beforeEach(() => {
  seed();
  resetAccountTokenMints();
  registerAccountStorage(
    {
      getAccountMap: vi.fn().mockResolvedValue(null),
      setAccountMap: vi.fn().mockResolvedValue(undefined),
      deleteAccountMap: vi.fn().mockResolvedValue(undefined),
    },
    "test-project",
  );
});

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
    await reconcileAllPushBindings(ctx());

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

describe("reconcileAllPushBindings", () => {
  it("re-registers every ENABLED account and leaves silenced ones alone", async () => {
    const axiosPublic = mockAxiosPublic();
    // user-1 (active): device POST, no mint.
    axiosPublic.mockResponse("post", {});
    // user-2: mint, then device POST.
    axiosPublic.mockResponse("post", {
      accessToken: "access-2",
      refreshToken: "refresh-2-successor",
    });
    axiosPublic.mockResponse("post", {});

    await reconcileAllPushBindings(ctx());

    const posts = axiosPublic.calls("post");
    expect(posts.map((c) => c.url)).toEqual([
      "/test-project/push-notifications/devices",
      "/test-project/auth/request-new-access-token",
      "/test-project/push-notifications/devices",
    ]);
    // user-3 is silenced: never minted for, never called for. Deregistering it
    // here would be a no-op bought with a rotation of its refresh token.
    expect(
      posts.some((c) => c.body && (c.body as { refreshToken?: string }).refreshToken === "refresh-3"),
    ).toBe(false);
    expect(axiosPublic.calls("delete")).toHaveLength(0);
  });

  it("keeps going when one account fails", async () => {
    const axiosPublic = mockAxiosPublic();
    axiosPublic.mockError("post", 500, { message: "nope" }); // user-1 device POST
    axiosPublic.mockResponse("post", {
      accessToken: "access-2",
      refreshToken: "refresh-2-successor",
    });
    axiosPublic.mockResponse("post", {});

    await expect(reconcileAllPushBindings(ctx())).resolves.toBeUndefined();
    expect(axiosPublic.calls("post")).toHaveLength(3);
  });
});
