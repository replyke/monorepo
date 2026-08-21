import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, cleanup, waitFor } from "@testing-library/react";

import {
  renderHookWithStore,
  stubFetchMock,
  unstubFetchMock,
  jsonResponse,
  makeAuthUser,
  mockAxiosPublic,
  resetAxiosMocks,
  type FetchMockHandle,
  type RtkQueryStore,
} from "../../test-utils";
import { setUser } from "../../store/slices/authSlice";
import { setTokens } from "../../store/slices/authSlice";
import {
  setAccountMap,
  type AccountEntry,
} from "../../store/slices/accountsSlice";
import {
  registerAccountStorage,
  resetAccountStorage,
} from "../../config/accountStorage";
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

function makeAccounts(): Record<string, AccountEntry> {
  return {
    "test-user-id": {
      refreshToken: "refresh-1",
      tokenExpiresAt: 0,
      user: { id: "test-user-id", name: null, email: null, avatar: null },
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
    it("persists the device identifier and enables the active account", async () => {
      fetchHandle.fetchMock.mockResolvedValueOnce(jsonResponse({}));
      const axiosPublic = mockAxiosPublic();
      // The bulk pass: user-2 mints then registers; user-3 is silenced.
      axiosPublic.mockResponse("post", {});
      axiosPublic.mockResponse("post", {
        accessToken: "access-2",
        refreshToken: "refresh-2-successor",
      });
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
      // The first register() on a device holding several accounts turns push on
      // for every enabled one — and leaves the silenced one silenced.
      expect(state.sublay.accounts.accounts["user-3"].pushEnabled).toBe(false);
      expect(
        axiosPublic
          .calls("post")
          .some((c) => c.body && (c.body as { refreshToken?: string }).refreshToken === "refresh-3"),
      ).toBe(false);
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

    it("re-registers every enabled account on the new token and leaves silenced ones alone", async () => {
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
      axiosPublic.mockResponse("post", {}); // active account re-registers
      axiosPublic.mockResponse("post", {
        accessToken: "access-2",
        refreshToken: "refresh-2-successor",
      });
      axiosPublic.mockResponse("post", {}); // user-2 re-registers

      await act(async () => {
        emit!(ROTATED);
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      await waitFor(() =>
        expect(store.getState().sublay.accounts.deviceIdentifier).toEqual(
          ROTATED,
        ),
      );

      const devicePosts = axiosPublic
        .calls("post")
        .filter((c) => c.url.includes("push-notifications/devices"));
      expect(devicePosts).toHaveLength(2);
      for (const call of devicePosts) expect(call.body).toEqual(ROTATED);
      // Silenced accounts are never minted for.
      expect(
        axiosPublic
          .calls("post")
          .some((c) => c.body && (c.body as { refreshToken?: string }).refreshToken === "refresh-3"),
      ).toBe(false);
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
