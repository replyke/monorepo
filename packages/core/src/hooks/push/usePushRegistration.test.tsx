import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useEffect, type ReactNode } from "react";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";

import {
  renderHookWithStore,
  stubFetchMock,
  unstubFetchMock,
  jsonResponse,
  makeAuthUser,
  mockAxiosPublic,
  makeRtkQueryStore,
  resetAxiosMocks,
  type FetchMockHandle,
  type RtkQueryStore,
} from "../../test-utils";
import { setUser } from "../../store/slices/authSlice";
import { setTokens } from "../../store/slices/authSlice";
import {
  setAccountMap,
  setAccountPushEnabled,
  setAccountsReady,
  registerAccountManager,
  type AccountEntry,
} from "../../store/slices/accountsSlice";
import {
  registerAccountStorage,
  resetAccountStorage,
} from "../../config/accountStorage";
import {
  SublayContext,
  type SublayContextValues,
} from "../../context/sublay-context";
import { resetAccountTokenMints } from "./mintAccountAccessToken";
import usePushRegistration from "./usePushRegistration";
import type {
  PushTokenAdapter,
  PushDeviceIdentifier,
} from "../../interfaces/PushTokenAdapter";

let fetchHandle: FetchMockHandle;

function makeAdapter(overrides: Partial<PushTokenAdapter> = {}): PushTokenAdapter {
  return {
    requestPermission: vi.fn().mockResolvedValue(true),
    getDeviceIdentifier: vi
      .fn()
      .mockResolvedValue({ platform: "ios", token: "device-token-1" }),
    ...overrides,
  };
}

beforeEach(() => {
  fetchHandle = stubFetchMock(async () => jsonResponse({}, 404));
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
  cleanup();
  unstubFetchMock();
  resetAxiosMocks();
  resetAccountStorage();
  resetAccountTokenMints();
});

const DEVICE: PushDeviceIdentifier = {
  platform: "ios",
  token: "device-token-1",
};
const ROTATED: PushDeviceIdentifier = {
  platform: "ios",
  token: "device-token-2",
};

// One account in each of the four states a push preference can be in:
//
//   test-user-id  ACTIVE,     explicitly enabled
//   user-2        background, explicitly enabled
//   user-3        background, explicitly SILENCED
//   user-4        background, NEVER ASKED (absent — every entry written before
//                 the flag existed looks like this)
function makeAccounts(): Record<string, AccountEntry> {
  return {
    "test-user-id": {
      refreshToken: "refresh-1",
      tokenExpiresAt: 0,
      user: { id: "test-user-id", name: null, email: null, avatar: null },
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

function seedAccounts(
  store: RtkQueryStore,
  deviceIdentifier: PushDeviceIdentifier | null = null,
) {
  act(() => {
    store.dispatch(setUser(makeAuthUser()));
    store.dispatch(
      setTokens({ accessToken: "access-1", refreshToken: "refresh-1" }),
    );
    store.dispatch(
      setAccountMap({
        activeAccountId: "test-user-id",
        accounts: makeAccounts(),
        deviceIdentifier,
      }),
    );
  });
}

/**
 * Re-registers account storage with a `setAccountMap` we can inspect, so a test
 * can assert on WHAT was persisted and not merely that something was.
 */
function spyOnPersistedMaps() {
  resetAccountStorage();
  const setAccountMapSpy = vi.fn().mockResolvedValue(undefined);
  registerAccountStorage(
    {
      getAccountMap: vi.fn().mockResolvedValue(null),
      setAccountMap: setAccountMapSpy,
      deleteAccountMap: vi.fn().mockResolvedValue(undefined),
    },
    "test-project",
  );
  return setAccountMapSpy;
}

/** Every map this device wrote, in order. */
function persistedMaps(setAccountMapSpy: ReturnType<typeof vi.fn>) {
  return setAccountMapSpy.mock.calls.map(
    ([, map]) => map as { accounts: Record<string, AccountEntry> },
  );
}

describe("usePushRegistration", () => {
  describe("register", () => {
    it("requests permission, fetches the identifier, and POSTs the device", async () => {
      fetchHandle.fetchMock.mockResolvedValueOnce(jsonResponse({}));
      const adapter = makeAdapter();
      const { result, store } = renderHookWithStore(
        () => usePushRegistration(adapter),
        { projectId: "test-project" },
      );
      act(() => store.dispatch(setUser(makeAuthUser())));

      let registered: boolean | undefined;
      await act(async () => {
        registered = await result.current.register();
      });

      expect(registered).toBe(true);
      expect(adapter.requestPermission).toHaveBeenCalledTimes(1);
      expect(adapter.getDeviceIdentifier).toHaveBeenCalledWith({
        projectId: "test-project",
      });

      const postCall = fetchHandle.calls().find((c) => c.method === "POST");
      expect(postCall?.url).toContain("/test-project/push-notifications/devices");
    });

    it("returns false without calling the API when permission is denied", async () => {
      const adapter = makeAdapter({
        requestPermission: vi.fn().mockResolvedValue(false),
      });
      const { result, store } = renderHookWithStore(
        () => usePushRegistration(adapter),
        { projectId: "test-project" },
      );
      act(() => store.dispatch(setUser(makeAuthUser())));

      let registered: boolean | undefined;
      await act(async () => {
        registered = await result.current.register();
      });

      expect(registered).toBe(false);
      expect(adapter.getDeviceIdentifier).not.toHaveBeenCalled();
      expect(fetchHandle.calls()).toHaveLength(0);
    });

    it("returns false without calling the API when the adapter yields no identifier", async () => {
      const adapter = makeAdapter({
        getDeviceIdentifier: vi.fn().mockResolvedValue(null),
      });
      const { result, store } = renderHookWithStore(
        () => usePushRegistration(adapter),
        { projectId: "test-project" },
      );
      act(() => store.dispatch(setUser(makeAuthUser())));

      let registered: boolean | undefined;
      await act(async () => {
        registered = await result.current.register();
      });

      expect(registered).toBe(false);
      expect(fetchHandle.calls()).toHaveLength(0);
    });

    it("throws when there is no authenticated user", async () => {
      const adapter = makeAdapter();
      const { result } = renderHookWithStore(() => usePushRegistration(adapter), {
        projectId: "test-project",
      });

      await expect(result.current.register()).rejects.toThrow(
        "No project ID or authenticated user available",
      );
      expect(adapter.requestPermission).not.toHaveBeenCalled();
    });

    it("re-throws on a failed registration request", async () => {
      fetchHandle.fetchMock.mockResolvedValueOnce(
        jsonResponse({ error: "boom" }, 500),
      );
      const adapter = makeAdapter();
      const { result, store } = renderHookWithStore(
        () => usePushRegistration(adapter),
        { projectId: "test-project" },
      );
      act(() => store.dispatch(setUser(makeAuthUser())));

      await expect(result.current.register()).rejects.toBeTruthy();
    });
  });

  describe("unregister", () => {
    it("fetches the identifier and DELETEs the device", async () => {
      fetchHandle.fetchMock.mockResolvedValueOnce(jsonResponse({}));
      const adapter = makeAdapter();
      const { result, store } = renderHookWithStore(
        () => usePushRegistration(adapter),
        { projectId: "test-project" },
      );
      act(() => store.dispatch(setUser(makeAuthUser())));

      await act(async () => {
        await result.current.unregister();
      });

      expect(adapter.requestPermission).not.toHaveBeenCalled();
      const deleteCall = fetchHandle.calls().find((c) => c.method === "DELETE");
      expect(deleteCall?.url).toContain("/test-project/push-notifications/devices");
    });

    it("is a no-op when the adapter yields no identifier", async () => {
      const adapter = makeAdapter({
        getDeviceIdentifier: vi.fn().mockResolvedValue(null),
      });
      const { result, store } = renderHookWithStore(
        () => usePushRegistration(adapter),
        { projectId: "test-project" },
      );
      act(() => store.dispatch(setUser(makeAuthUser())));

      await act(async () => {
        await result.current.unregister();
      });

      expect(fetchHandle.calls()).toHaveLength(0);
    });

    it("throws when there is no authenticated user", async () => {
      const adapter = makeAdapter();
      const { result } = renderHookWithStore(() => usePushRegistration(adapter), {
        projectId: "test-project",
      });

      await expect(result.current.unregister()).rejects.toThrow(
        "No project ID or authenticated user available",
      );
    });

    it("re-throws on a failed deregistration request", async () => {
      fetchHandle.fetchMock.mockResolvedValueOnce(
        jsonResponse({ error: "boom" }, 500),
      );
      const adapter = makeAdapter();
      const { result, store } = renderHookWithStore(
        () => usePushRegistration(adapter),
        { projectId: "test-project" },
      );
      act(() => store.dispatch(setUser(makeAuthUser())));

      await expect(result.current.unregister()).rejects.toBeTruthy();
    });
  });

  describe("device identifier + pushEnabled ownership", () => {
    it("persists the device identifier, enables the active account, and binds THAT account and no other", async () => {
      // The claim this test's comment used to make and its assertions did not
      // check. It read the Redux flags only, so "nothing else goes out" was
      // prose: the active account's re-bind could vanish entirely, or every
      // stored account could be bound, and this stayed green either way.
      //
      // What Phase 6 actually does is bind ONE account — the active one, whose
      // session is already live and costs nothing to use — and MARK the rest.
      // So the assertions are on the requests.
      fetchHandle.fetchMock.mockResolvedValueOnce(jsonResponse({}));
      const axiosPublic = mockAxiosPublic();
      // The active account's re-bind. Nothing else goes out.
      axiosPublic.mockResponse("post", {});

      const adapter = makeAdapter();
      const { result, store } = renderHookWithStore(
        () => usePushRegistration(adapter),
        { projectId: "test-project" },
      );
      seedAccounts(store);

      await act(async () => {
        await result.current.register();
      });

      const state = store.getState();
      expect(state.sublay.accounts.deviceIdentifier).toEqual(DEVICE);
      expect(
        state.sublay.accounts.accounts["test-user-id"].pushEnabled,
      ).toBe(true);

      const posts = axiosPublic.calls("post");
      const deviceCalls = posts.filter((c) =>
        c.url.includes("push-notifications/devices"),
      );
      // EXACTLY ONE, carrying this device's identifier under the ACTIVE
      // account's live session.
      expect(deviceCalls).toHaveLength(1);
      expect(deviceCalls[0].body).toEqual(DEVICE);
      expect(deviceCalls[0].config?.headers.Authorization).toBe(
        "Bearer access-1",
      );
      // ...and no stored credential was spent to reach any of the others.
      expect(
        posts.filter((c) => c.url.includes("request-new-access-token")),
      ).toHaveLength(0);
      expect(
        axiosPublic
          .calls("delete")
          .filter((c) => c.url.includes("push-notifications/devices")),
      ).toHaveLength(0);
    });

    it("records an explicit preference for EVERY account that never expressed one", async () => {
      // `register()` has always documented that it turns push on for every
      // stored account, and it wrote the flag for the active one only. That gap
      // is what would strand an upgrading install: binding requires an EXPLICIT
      // opt-in, every entry written before the flag existed is absent, and
      // nothing else ever writes it except a deliberate per-account toggle — so
      // those accounts would be neither marked nor bound, and opening them
      // would not help either.
      fetchHandle.fetchMock.mockResolvedValueOnce(jsonResponse({}));
      const axiosPublic = mockAxiosPublic();
      axiosPublic.mockResponse("post", {});

      const adapter = makeAdapter();
      const { result, store } = renderHookWithStore(
        () => usePushRegistration(adapter),
        { projectId: "test-project" },
      );
      seedAccounts(store);

      await act(async () => {
        await result.current.register();
      });

      const accounts = store.getState().sublay.accounts.accounts;
      // Never asked -> now explicitly on, so it has a route to push.
      expect(accounts["user-4"].pushEnabled).toBe(true);
      expect(accounts["test-user-id"].pushEnabled).toBe(true);
      expect(accounts["user-2"].pushEnabled).toBe(true);
      // ...and an account the user DELIBERATELY SILENCED stays silenced. This
      // call speaks for accounts that were never asked, not over accounts that
      // answered.
      expect(accounts["user-3"].pushEnabled).toBe(false);
    });

    it("marks the other accounts rather than exchanging their credentials", async () => {
      fetchHandle.fetchMock.mockResolvedValueOnce(jsonResponse({}));
      const axiosPublic = mockAxiosPublic();
      axiosPublic.mockResponse("post", {});

      const adapter = makeAdapter();
      const { result, store } = renderHookWithStore(
        () => usePushRegistration(adapter),
        { projectId: "test-project" },
      );
      seedAccounts(store);

      await act(async () => {
        await result.current.register();
      });

      // On the REQUESTS: no stored refresh token was presented for anybody.
      const posts = axiosPublic.calls("post");
      expect(
        posts.filter((c) => c.url.includes("request-new-access-token")),
      ).toHaveLength(0);
      for (const token of ["refresh-2", "refresh-3", "refresh-4"]) {
        expect(
          posts.some(
            (c) =>
              c.body &&
              (c.body as { refreshToken?: string }).refreshToken === token,
          ),
        ).toBe(false);
      }

      const accounts = store.getState().sublay.accounts.accounts;
      expect(accounts["user-2"].needsPushRebind).toBe(true);
      // Just enabled by this very call, so it is marked too — it has an
      // explicit preference now and no binding yet.
      expect(accounts["user-4"].needsPushRebind).toBe(true);
      // Silenced: nothing to repair.
      expect(accounts["user-3"].needsPushRebind).toBeUndefined();
      // Active: re-bound on the spot instead.
      expect(accounts["test-user-id"].needsPushRebind).toBeUndefined();
    });

    it("re-registering the same device token marks ONLY the accounts it just enabled", async () => {
      // THIS TEST USED TO ASSERT THE OPPOSITE, and pinned a bug in place. The
      // reasoning it gave — "nothing about the other accounts\' bindings went
      // stale" — is true of an account that was ALREADY bound and false of one
      // that never had a binding at all. `register()` flips every
      // never-asked account to enabled, and the marking was gated on the device
      // token having changed, so on an unchanged token those accounts came out
      // reported enabled by the public predicate, with no server binding and no
      // mark: silent, and shown in the switcher as fine.
      fetchHandle.fetchMock.mockResolvedValueOnce(jsonResponse({}));
      const axiosPublic = mockAxiosPublic();
      axiosPublic.mockResponse("post", {});

      const adapter = makeAdapter();
      const { result, store } = renderHookWithStore(
        () => usePushRegistration(adapter),
        { projectId: "test-project" },
      );
      // Already registered with the identifier this adapter is about to yield —
      // a settings screen calling register() again, or a second tap on "Enable
      // notifications".
      seedAccounts(store, { platform: "ios", token: "device-token-1" });

      await act(async () => {
        await result.current.register();
      });

      const accounts = store.getState().sublay.accounts.accounts;
      // NEVER ASKED until this very call flipped it on. It now reports as
      // push-enabled and has no binding — only the active account was
      // registered — so it is marked, and the activation-time reconcile is what
      // will actually bind it.
      expect(accounts["user-4"].pushEnabled).toBe(true);
      expect(accounts["user-4"].needsPushRebind).toBe(true);
      // ALREADY explicitly enabled and already bound to this same identifier:
      // nothing went stale, so it must NOT be told its notifications are
      // paused. Marking it would surface "open to resume" on an account that is
      // working, clearing only when it is individually opened.
      expect(accounts["user-2"].needsPushRebind).toBeUndefined();
      // Silenced: nothing to repair.
      expect(accounts["user-3"].needsPushRebind).toBeUndefined();
      // Active: re-bound on the spot instead.
      expect(accounts["test-user-id"].needsPushRebind).toBeUndefined();

      // Still exchanges nothing, on the requests rather than on a call count.
      expect(
        axiosPublic
          .calls("post")
          .filter((c) => c.url.includes("request-new-access-token")),
      ).toHaveLength(0);
    });

    it("marks nothing at all on a repeat register() once every account has answered", async () => {
      // The case the unchanged-token gate was written for, kept intact: a
      // second tap on "Enable notifications" when there is nothing new to
      // enable must leave every account alone.
      fetchHandle.fetchMock.mockResolvedValueOnce(jsonResponse({}));
      const axiosPublic = mockAxiosPublic();
      axiosPublic.mockResponse("post", {});

      const adapter = makeAdapter();
      const { result, store } = renderHookWithStore(
        () => usePushRegistration(adapter),
        { projectId: "test-project" },
      );
      seedAccounts(store, { platform: "ios", token: "device-token-1" });
      // Every account has now expressed a preference, so this call flips none.
      act(() => {
        store.dispatch(
          setAccountPushEnabled({ userId: "user-4", enabled: true }),
        );
      });

      await act(async () => {
        await result.current.register();
      });

      const accounts = store.getState().sublay.accounts.accounts;
      expect(accounts["user-2"].needsPushRebind).toBeUndefined();
      expect(accounts["user-3"].needsPushRebind).toBeUndefined();
      expect(accounts["user-4"].needsPushRebind).toBeUndefined();
      expect(accounts["test-user-id"].needsPushRebind).toBeUndefined();
    });

    it("unregister durably silences the account and keeps the device identifier", async () => {
      fetchHandle.fetchMock.mockResolvedValueOnce(jsonResponse({}));
      const adapter = makeAdapter();
      const { result, store } = renderHookWithStore(
        () => usePushRegistration(adapter),
        { projectId: "test-project" },
      );
      seedAccounts(store, DEVICE);

      await act(async () => {
        await result.current.unregister();
      });

      const state = store.getState();
      expect(
        state.sublay.accounts.accounts["test-user-id"].pushEnabled,
      ).toBe(false);
      // NEVER cleared by a per-account unregister: it is device state, and
      // clearing it would disable removal-deregistration, the toggle and
      // rotation detection for every other stored account.
      expect(state.sublay.accounts.deviceIdentifier).toEqual(DEVICE);
    });

    it("unregister persists the identifier it fetched, on an install that had none", async () => {
      // `unregister()` always fetched this value and threw it away. It is the
      // second discovery path for an upgrading install: the previous release
      // registered a device and stored nothing, so without this the app has a
      // live server-side binding and no local identifier to unbind it with.
      fetchHandle.fetchMock.mockResolvedValueOnce(jsonResponse({}));
      const adapter = makeAdapter();
      const { result, store } = renderHookWithStore(
        () => usePushRegistration(adapter),
        { projectId: "test-project" },
      );
      seedAccounts(store, null);
      expect(store.getState().sublay.accounts.deviceIdentifier).toBeNull();

      await act(async () => {
        await result.current.unregister();
      });

      expect(store.getState().sublay.accounts.deviceIdentifier).toEqual(DEVICE);
    });
  });

  describe("device-token change detection", () => {
    it("mounts even when NO identifier is stored, so an upgrading install can discover one", () => {
      // This used to be gated on an identifier already being stored, which was
      // a chicken-and-egg: the previous release's `register()` persisted
      // nothing, so no upgrading install has one, and this subscription is the
      // only path that can acquire one without the app calling `register()`
      // again. With the gate in place the entire per-account push subsystem
      // silently no-opped on every upgrading install.
      const subscribe = vi.fn().mockReturnValue(() => {});
      const adapter = makeAdapter({
        subscribeToIdentifierChanges: subscribe,
      });
      const { store } = renderHookWithStore(
        () => usePushRegistration(adapter),
        { projectId: "test-project" },
      );
      act(() => store.dispatch(setUser(makeAuthUser())));

      expect(store.getState().sublay.accounts.deviceIdentifier).toBeNull();
      expect(subscribe).toHaveBeenCalledTimes(1);
      expect(subscribe.mock.calls[0][0]).toEqual({ projectId: "test-project" });
      // Discovery must never cost the user a permission prompt.
      expect(adapter.requestPermission).not.toHaveBeenCalled();
      expect(adapter.getDeviceIdentifier).not.toHaveBeenCalled();
    });

    it("READS the current identifier once on mount when the adapter says that cannot prompt", async () => {
      // THE NATIVE UPGRADE GAP. Both native subscriptions are ROTATION-ONLY —
      // they emit when the OS hands over a NEW token, never merely because
      // something subscribed — so an install that registered before this SDK
      // persisted identifiers has a live server-side binding, no local
      // identifier, and no event coming for months or ever. Every unbind path
      // (sign-out, account removal, the per-account toggle) is gated on having
      // one, so all three silently no-op. It is Expo AND React Native, not just
      // React Native on iOS.
      const store = makeRtkQueryStore();
      store.dispatch(setUser(makeAuthUser()));
      store.dispatch(
        setTokens({ accessToken: "access-1", refreshToken: "refresh-1" }),
      );
      store.dispatch(
        setAccountMap({
          activeAccountId: "test-user-id",
          accounts: makeAccounts(),
          deviceIdentifier: null,
        }),
      );

      const adapter = makeAdapter({
        canReadIdentifierWithoutPrompting: true,
        subscribeToIdentifierChanges: vi.fn().mockReturnValue(() => {}),
      });
      renderHookWithStore(() => usePushRegistration(adapter), {
        projectId: "test-project",
        store,
      });

      await waitFor(() =>
        expect(store.getState().sublay.accounts.deviceIdentifier).toEqual(DEVICE),
      );
      // Acquired WITHOUT waiting for a rotation and WITHOUT asking the user for
      // anything — the declaration is exactly the promise that this call reads
      // state the OS already holds.
      expect(adapter.requestPermission).not.toHaveBeenCalled();
      expect(adapter.getDeviceIdentifier).toHaveBeenCalledTimes(1);
    });

    it("does NOT read the identifier on mount when the OS permission was never granted", async () => {
      // A DEVICE TOKEN IS NOT CONSENT. On both native platforms the OS issues
      // one whether or not the user was ever asked — that is what makes silent
      // push work — so "the read cannot prompt" says nothing about whether this
      // install has anything to unbind. Ungated, every native install that
      // merely mounts this hook stored a push identifier, and `signOutThunk`
      // sends `pushDevice` whenever one is stored: ordinary sign-outs then ask
      // the server to unbind something that was never bound, and its
      // `no-matching-binding` warning — a line that flags a REAL client/server
      // key mismatch — fires on routine traffic and stops meaning anything.
      //
      // `register()` cannot create a binding without a grant (it stops at
      // `requestPermission()`), so no grant implies no binding.
      const store = makeRtkQueryStore();
      store.dispatch(setUser(makeAuthUser()));
      store.dispatch(
        setTokens({ accessToken: "access-1", refreshToken: "refresh-1" }),
      );
      store.dispatch(
        setAccountMap({
          activeAccountId: "test-user-id",
          accounts: makeAccounts(),
          deviceIdentifier: null,
        }),
      );

      const adapter = makeAdapter({
        canReadIdentifierWithoutPrompting: true,
        hasPermission: vi.fn().mockResolvedValue(false),
        subscribeToIdentifierChanges: vi.fn().mockReturnValue(() => {}),
      });
      renderHookWithStore(() => usePushRegistration(adapter), {
        projectId: "test-project",
        store,
      });

      await waitFor(() => expect(adapter.hasPermission).toHaveBeenCalled());
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(adapter.getDeviceIdentifier).not.toHaveBeenCalled();
      expect(store.getState().sublay.accounts.deviceIdentifier).toBeNull();
      // And asking is never a substitute for reading: the gate must not turn
      // into a prompt on mount.
      expect(adapter.requestPermission).not.toHaveBeenCalled();
    });

    it("DOES read the identifier on mount once permission is granted", async () => {
      // The other side of the gate, and the population the read exists for: an
      // install that registered on a previous release granted permission to get
      // there, so a grant is what "this install could have a binding" looks
      // like from the client.
      const store = makeRtkQueryStore();
      store.dispatch(setUser(makeAuthUser()));
      store.dispatch(
        setTokens({ accessToken: "access-1", refreshToken: "refresh-1" }),
      );
      store.dispatch(
        setAccountMap({
          activeAccountId: "test-user-id",
          accounts: makeAccounts(),
          deviceIdentifier: null,
        }),
      );

      const adapter = makeAdapter({
        canReadIdentifierWithoutPrompting: true,
        hasPermission: vi.fn().mockResolvedValue(true),
        subscribeToIdentifierChanges: vi.fn().mockReturnValue(() => {}),
      });
      renderHookWithStore(() => usePushRegistration(adapter), {
        projectId: "test-project",
        store,
      });

      await waitFor(() =>
        expect(store.getState().sublay.accounts.deviceIdentifier).toEqual(DEVICE),
      );
      expect(adapter.getDeviceIdentifier).toHaveBeenCalledTimes(1);
      expect(adapter.requestPermission).not.toHaveBeenCalled();
    });

    it("does NOT read the identifier on mount for an adapter that has not declared it", async () => {
      // The web adapter's `getDeviceIdentifier` calls `pushManager.subscribe()`,
      // which can raise a permission prompt with no user gesture. It declares
      // nothing here and must never be read on mount; it covers the same ground
      // through a subscription that emits from `getSubscription()`.
      const store = makeRtkQueryStore();
      store.dispatch(setUser(makeAuthUser()));
      const adapter = makeAdapter({
        subscribeToIdentifierChanges: vi.fn().mockReturnValue(() => {}),
      });
      renderHookWithStore(() => usePushRegistration(adapter), {
        projectId: "test-project",
        store,
      });

      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(adapter.getDeviceIdentifier).not.toHaveBeenCalled();
      expect(adapter.requestPermission).not.toHaveBeenCalled();
      expect(store.getState().sublay.accounts.deviceIdentifier).toBeNull();
    });

    it("the mount read is a no-op when the identifier already matches the stored one", async () => {
      // The steady state, which is nearly every launch: one adapter call, and
      // nothing marked, nothing persisted, nothing sent.
      const store = makeRtkQueryStore();
      store.dispatch(setUser(makeAuthUser()));
      store.dispatch(
        setTokens({ accessToken: "access-1", refreshToken: "refresh-1" }),
      );
      store.dispatch(
        setAccountMap({
          activeAccountId: "test-user-id",
          accounts: makeAccounts(),
          deviceIdentifier: DEVICE,
        }),
      );
      const axiosPublic = mockAxiosPublic();

      const adapter = makeAdapter({
        canReadIdentifierWithoutPrompting: true,
        subscribeToIdentifierChanges: vi.fn().mockReturnValue(() => {}),
      });
      renderHookWithStore(() => usePushRegistration(adapter), {
        projectId: "test-project",
        store,
      });

      await waitFor(() =>
        expect(adapter.getDeviceIdentifier).toHaveBeenCalledTimes(1),
      );
      await new Promise((resolve) => setTimeout(resolve, 20));

      const accounts = store.getState().sublay.accounts.accounts;
      expect(accounts["user-2"].needsPushRebind).toBeUndefined();
      expect(accounts["test-user-id"].needsPushRebind).toBeUndefined();
      expect(axiosPublic.calls("post")).toHaveLength(0);
    });

    // ── THE MOUNT READ MUST NOT OUTRUN THE ACCOUNT RESTORE ──────────────────
    //
    // `applyIdentifierChange` persists the WHOLE account map. Run it before the
    // stored accounts have been restored into the slice and it writes the empty
    // map it can see over the real one on disk — every account on the device,
    // gone, from a read nobody asked for. The two tests below hold the two gates
    // that stop it; each fails if its gate is removed.
    it("waits out the account manager's own registration before reading on mount", async () => {
      // The provider that registers the manager is this hook's PARENT, and React
      // flushes child effects BEFORE parent effects — so on the hook's first pass
      // `accountManagerRegistered` is still false and the readiness gate would
      // wave the read straight through. Waiting a microtask is what puts the
      // registration on the state this effect reads.
      const setAccountMapSpy = spyOnPersistedMaps();
      const store = makeRtkQueryStore();
      store.dispatch(setUser(makeAuthUser()));
      store.dispatch(
        setTokens({ accessToken: "access-1", refreshToken: "refresh-1" }),
      );

      const adapter = makeAdapter({
        canReadIdentifierWithoutPrompting: true,
        subscribeToIdentifierChanges: vi.fn().mockReturnValue(() => {}),
      });

      function RegisterManagerOnMount({ children }: { children: ReactNode }) {
        useEffect(() => {
          store.dispatch(registerAccountManager());
        }, []);
        return <>{children}</>;
      }

      renderHook(() => usePushRegistration(adapter), {
        wrapper: ({ children }: { children: ReactNode }) => (
          <Provider store={store}>
            <SublayContext.Provider
              value={
                {
                  projectId: "test-project",
                  project: null,
                } as SublayContextValues
              }
            >
              <RegisterManagerOnMount>{children}</RegisterManagerOnMount>
            </SublayContext.Provider>
          </Provider>
        ),
      });

      await new Promise((resolve) => setTimeout(resolve, 20));

      // The manager did register — just a beat later than this hook's effect.
      expect(store.getState().sublay.accounts.accountManagerRegistered).toBe(
        true,
      );
      expect(adapter.getDeviceIdentifier).not.toHaveBeenCalled();
      expect(setAccountMapSpy).not.toHaveBeenCalled();
      expect(store.getState().sublay.accounts.deviceIdentifier).toBeNull();

      // Once the restore lands, the read proceeds against the real map.
      act(() => {
        store.dispatch(
          setAccountMap({
            activeAccountId: "test-user-id",
            accounts: makeAccounts(),
            deviceIdentifier: null,
          }),
        );
        store.dispatch(setAccountsReady(true));
      });

      await waitFor(() =>
        expect(store.getState().sublay.accounts.deviceIdentifier).toEqual(
          DEVICE,
        ),
      );
      const maps = persistedMaps(setAccountMapSpy);
      expect(maps.length).toBeGreaterThan(0);
      for (const map of maps) {
        expect(Object.keys(map.accounts)).toHaveLength(4);
      }
    });

    it("does not apply a mount-read identifier before the accounts are restored", async () => {
      // Manager registered before the render, so the microtask gate is satisfied
      // the moment it elapses and readiness is the only thing holding the read
      // back. Storage has not answered yet: the slice holds no accounts.
      const setAccountMapSpy = spyOnPersistedMaps();
      const store = makeRtkQueryStore();
      store.dispatch(setUser(makeAuthUser()));
      store.dispatch(
        setTokens({ accessToken: "access-1", refreshToken: "refresh-1" }),
      );
      store.dispatch(registerAccountManager());

      const adapter = makeAdapter({
        canReadIdentifierWithoutPrompting: true,
        subscribeToIdentifierChanges: vi.fn().mockReturnValue(() => {}),
      });
      renderHookWithStore(() => usePushRegistration(adapter), {
        projectId: "test-project",
        store,
      });

      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(store.getState().sublay.accounts.isReady).toBe(false);
      expect(adapter.getDeviceIdentifier).not.toHaveBeenCalled();
      expect(setAccountMapSpy).not.toHaveBeenCalled();
      expect(store.getState().sublay.accounts.deviceIdentifier).toBeNull();

      act(() => {
        store.dispatch(
          setAccountMap({
            activeAccountId: "test-user-id",
            accounts: makeAccounts(),
            deviceIdentifier: null,
          }),
        );
        store.dispatch(setAccountsReady(true));
      });

      await waitFor(() =>
        expect(store.getState().sublay.accounts.deviceIdentifier).toEqual(
          DEVICE,
        ),
      );
      // Nothing was ever written from a pre-restore snapshot.
      const maps = persistedMaps(setAccountMapSpy);
      expect(maps.length).toBeGreaterThan(0);
      for (const map of maps) {
        expect(Object.keys(map.accounts)).toHaveLength(4);
      }
    });

    it("mounts nothing when the adapter does not support subscription", () => {
      // The remaining gate: an adapter with no `subscribeToIdentifierChanges`
      // simply has no rotation coverage, which is the documented fallback.
      const adapter = makeAdapter();
      const { store } = renderHookWithStore(
        () => usePushRegistration(adapter),
        { projectId: "test-project" },
      );
      seedAccounts(store, DEVICE);

      expect(adapter.requestPermission).not.toHaveBeenCalled();
      expect(adapter.getDeviceIdentifier).not.toHaveBeenCalled();
    });

    it("an install with no stored identifier acquires one from the subscription", () => {
      // The self-heal end to end: `applyIdentifierChange` handles a null
      // current correctly — nothing to unbind, so it simply records what it was
      // handed. That is what gives sign-out and account removal something to
      // send.
      let emit: ((next: PushDeviceIdentifier | null) => void) | undefined;
      const adapter = makeAdapter({
        subscribeToIdentifierChanges: (_ctx, onChange) => {
          emit = onChange;
          return () => {};
        },
      });
      const { store } = renderHookWithStore(
        () => usePushRegistration(adapter),
        { projectId: "test-project" },
      );
      act(() => {
        store.dispatch(setUser(makeAuthUser()));
        store.dispatch(
          setAccountMap({
            activeAccountId: "test-user-id",
            accounts: makeAccounts(),
            deviceIdentifier: null,
          }),
        );
      });

      expect(store.getState().sublay.accounts.deviceIdentifier).toBeNull();

      const axiosPublic = mockAxiosPublic();
      axiosPublic.mockResponse("post", {});
      axiosPublic.mockResponse("post", {
        accessToken: "access-2",
        refreshToken: "refresh-2-successor",
      });
      axiosPublic.mockResponse("post", {});

      act(() => {
        emit!(DEVICE);
      });

      return waitFor(() =>
        expect(store.getState().sublay.accounts.deviceIdentifier).toEqual(
          DEVICE,
        ),
      );
    });

    it("mounts on launch once an identifier is stored, without calling register()", () => {
      const subscribe = vi.fn().mockReturnValue(() => {});
      const adapter = makeAdapter({
        subscribeToIdentifierChanges: subscribe,
      });
      const { store } = renderHookWithStore(
        () => usePushRegistration(adapter),
        { projectId: "test-project" },
      );
      seedAccounts(store, DEVICE);

      expect(subscribe).toHaveBeenCalledTimes(1);
      expect(subscribe.mock.calls[0][0]).toEqual({ projectId: "test-project" });
      expect(adapter.requestPermission).not.toHaveBeenCalled();
      expect(adapter.getDeviceIdentifier).not.toHaveBeenCalled();
    });

    it("MARKS the background accounts on a rotation and exchanges nothing", async () => {
      // The mechanism this replaces re-bound every enabled stored account by
      // trading its refresh token for a temporary session. That trade is
      // one-time-use: the server revokes the presented token as it answers, and
      // an interruption before the successor is durably written leaves the
      // account permanently locked out. It ran for up to five accounts, in the
      // background, at launch.
      let emit: ((next: PushDeviceIdentifier | null) => void) | undefined;
      const adapter = makeAdapter({
        subscribeToIdentifierChanges: (_ctx, onChange) => {
          emit = onChange;
          return () => {};
        },
      });
      const { store } = renderHookWithStore(
        () => usePushRegistration(adapter),
        { projectId: "test-project" },
      );
      seedAccounts(store, DEVICE);

      // The old identifier's DELETE goes out over RTK Query.
      fetchHandle.fetchMock.mockResolvedValueOnce(jsonResponse({}));
      const axiosPublic = mockAxiosPublic();
      axiosPublic.mockResponse("post", {}); // the ACTIVE account re-registers

      await act(async () => {
        emit!(ROTATED);
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      await waitFor(() =>
        expect(store.getState().sublay.accounts.deviceIdentifier).toEqual(
          ROTATED,
        ),
      );

      // ⚠ ASSERTED ON THE REQUESTS, not on a mock's call count. The bulk loop no
      // longer exists, so "the loop was not called" would be vacuously true of
      // any rewrite that still exchanged.
      const posts = axiosPublic.calls("post");
      expect(
        posts.filter((c) => c.url.includes("request-new-access-token")),
      ).toHaveLength(0);
      for (const token of ["refresh-2", "refresh-3", "refresh-4"]) {
        expect(
          posts.some(
            (c) =>
              c.body &&
              (c.body as { refreshToken?: string }).refreshToken === token,
          ),
        ).toBe(false);
      }

      // The ACTIVE account is still re-bound immediately — it costs nothing,
      // because its session is already live.
      const devicePosts = posts.filter((c) =>
        c.url.includes("push-notifications/devices"),
      );
      expect(devicePosts).toHaveLength(1);
      expect(devicePosts[0].body).toEqual(ROTATED);

      const accounts = store.getState().sublay.accounts.accounts;
      expect(accounts["user-2"].needsPushRebind).toBe(true);
      expect(accounts["test-user-id"].needsPushRebind).toBeUndefined();
      // Silenced, and never asked: neither is marked, because neither has a
      // binding that a rotation could have invalidated.
      expect(accounts["user-3"].needsPushRebind).toBeUndefined();
      expect(accounts["user-4"].needsPushRebind).toBeUndefined();
    });

    it("persists the marks, so they survive a relaunch", async () => {
      const setAccountMap = vi.fn().mockResolvedValue(undefined);
      registerAccountStorage(
        {
          getAccountMap: vi.fn().mockResolvedValue(null),
          setAccountMap,
          deleteAccountMap: vi.fn().mockResolvedValue(undefined),
        },
        "test-project",
      );

      let emit: ((next: PushDeviceIdentifier | null) => void) | undefined;
      const adapter = makeAdapter({
        subscribeToIdentifierChanges: (_ctx, onChange) => {
          emit = onChange;
          return () => {};
        },
      });
      const { store } = renderHookWithStore(
        () => usePushRegistration(adapter),
        { projectId: "test-project" },
      );
      seedAccounts(store, DEVICE);

      fetchHandle.fetchMock.mockResolvedValueOnce(jsonResponse({}));
      const axiosPublic = mockAxiosPublic();
      axiosPublic.mockResponse("post", {});

      await act(async () => {
        emit!(ROTATED);
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      await waitFor(() =>
        expect(store.getState().sublay.accounts.deviceIdentifier).toEqual(
          ROTATED,
        ),
      );

      // The rotation happens once; the repair may be several launches away. A
      // mark that only lived in Redux would be gone by then, and the account
      // would go quiet with nothing recording why.
      await waitFor(() => {
        const written = setAccountMap.mock.calls
          .map((call) => call[1] as { accounts: Record<string, { needsPushRebind?: boolean }> })
          .filter((map) => map.accounts["user-2"]?.needsPushRebind === true);
        expect(written.length).toBeGreaterThan(0);
      });
    });

    it("ignores an emitted identifier equal to the stored one", async () => {
      let emit: ((next: PushDeviceIdentifier | null) => void) | undefined;
      const adapter = makeAdapter({
        subscribeToIdentifierChanges: (_ctx, onChange) => {
          emit = onChange;
          return () => {};
        },
      });
      const { store } = renderHookWithStore(
        () => usePushRegistration(adapter),
        { projectId: "test-project" },
      );
      seedAccounts(store, DEVICE);

      const axiosPublic = mockAxiosPublic();

      await act(async () => {
        emit!({ ...DEVICE });
        emit!(null);
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(axiosPublic.calls("post")).toHaveLength(0);
      expect(fetchHandle.calls()).toHaveLength(0);
    });

    it("unsubscribes on unmount", () => {
      const unsubscribe = vi.fn();
      const adapter = makeAdapter({
        subscribeToIdentifierChanges: vi.fn().mockReturnValue(unsubscribe),
      });
      const { store, unmount } = renderHookWithStore(
        () => usePushRegistration(adapter),
        { projectId: "test-project" },
      );
      seedAccounts(store, DEVICE);

      unmount();
      expect(unsubscribe).toHaveBeenCalled();
    });
  });
});
