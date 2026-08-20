import { describe, it, expect, afterEach, vi } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { renderHook, waitFor } from "@testing-library/react";

import { mockAxiosPublic, resetAxiosMocks } from "../test-utils";
import { sublayReducers, sublayApiReducer, sublayMiddleware } from "../store/integration";
import { useSublaySelector } from "../store/hooks";
import { selectInitialized } from "../store/slices/authSlice";
import { SublayIntegrationProvider } from "./sublay-integration-context";
import useProject from "../hooks/projects/useProject";
import useAccountSync from "../hooks/auth/useAccountSync";
import {
  selectAccounts,
  selectAccountsReady,
  setDeviceIdentifier,
  type AccountMap,
} from "../store/slices/accountsSlice";
import { selectRefreshToken } from "../store/slices/authSlice";
import type { AccountStorage } from "../interfaces/AccountStorage";
import {
  persistAccountMapFor,
  resetAccountStorage,
} from "../config/accountStorage";

afterEach(() => {
  resetAxiosMocks();
  resetAccountStorage();
});

/** Stands in for a platform package's `AccountManager`. */
function makeAccountManager(storage: AccountStorage) {
  return function AccountManagerLike() {
    const { projectId } = useProject();
    useAccountSync(storage, projectId!);
    return null;
  };
}

function makeFakeStorage(initial: AccountMap | null): AccountStorage {
  let stored = initial;
  return {
    getAccountMap: vi.fn(async () => stored),
    setAccountMap: vi.fn(async (_projectId: string, map: AccountMap) => {
      stored = map;
    }),
    deleteAccountMap: vi.fn(async () => {
      stored = null;
    }),
  };
}

describe("SublayIntegrationProvider (host-owned external store)", () => {
  it("mounts sublayReducers/sublayApiReducer/sublayMiddleware into a host-built store and bootstraps project + auth state", async () => {
    const axiosPublic = mockAxiosPublic();
    axiosPublic.mockResponse("get", { id: "test-project", integrations: [] });

    // A store built the way a host app would, per the provider's own JSDoc:
    // sublay reducers/middleware mounted alongside the host's own reducer.
    const externalStore = configureStore({
      reducer: {
        sublay: sublayReducers,
        sublayApi: sublayApiReducer,
        host: (state = { ownedByHost: true }) => state,
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(...sublayMiddleware),
    });

    const { result } = renderHook(
      () => ({
        project: useProject(),
        initialized: useSublaySelector(selectInitialized),
      }),
      {
        wrapper: ({ children }) => (
          <Provider store={externalStore}>
            <SublayIntegrationProvider projectId="test-project">
              {children}
            </SublayIntegrationProvider>
          </Provider>
        ),
      },
    );

    await waitFor(() =>
      expect(result.current.project.project).toEqual({ id: "test-project", integrations: [] }),
    );
    expect(result.current.project.projectId).toBe("test-project");

    await waitFor(() => expect(result.current.initialized).toBe(true));

    // The host's own slice survived being mounted alongside sublay's.
    expect((externalStore.getState() as { host: unknown }).host).toEqual({
      ownedByHost: true,
    });

    const [call] = axiosPublic.calls("get");
    expect(call.url).toBe("/test-project/projects/lean");
  });

  it("throws when no projectId is provided", () => {
    const externalStore = configureStore({
      reducer: { sublay: sublayReducers, sublayApi: sublayApiReducer },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(...sublayMiddleware),
    });

    // React + jsdom log the error to console even though it's caught below —
    // silence that expected noise for this one test.
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() =>
      renderHook(() => null, {
        wrapper: ({ children }) => (
          <Provider store={externalStore}>
            <SublayIntegrationProvider projectId={"" as never}>
              {children}
            </SublayIntegrationProvider>
          </Provider>
        ),
      }),
    ).toThrow("Please pass a project ID");

    consoleSpy.mockRestore();
  });
});

describe("SublayIntegrationProvider — account persistence", () => {
  it("persists and reloads its account map once an AccountManager is mounted inside it", async () => {
    // The regression test for a pre-existing defect: core's integration
    // provider is re-exported by the platform packages untouched, and core
    // cannot mount an AccountManager itself, so integration-mode apps used to
    // persist nothing at all. Each platform package now wraps it the same way
    // it already wrapped SublayProvider; this asserts the mechanism that
    // wrapping relies on.
    const axiosPublic = mockAxiosPublic();
    axiosPublic.mockResponse("get", { id: "test-project", integrations: [] });

    const storage = makeFakeStorage({
      activeAccountId: "user-1",
      accounts: {
        "user-1": {
          refreshToken: "stored-refresh-token",
          tokenExpiresAt: 1893456000000,
          user: {
            id: "user-1",
            name: "Alice",
            username: "alice",
            email: null,
            avatar: null,
          },
        },
      },
      signedOut: false,
    });
    const AccountManagerLike = makeAccountManager(storage);

    const externalStore = configureStore({
      reducer: { sublay: sublayReducers, sublayApi: sublayApiReducer },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(...sublayMiddleware),
    });

    const { result } = renderHook(
      () => ({
        accounts: useSublaySelector(selectAccounts),
        refreshToken: useSublaySelector(selectRefreshToken),
        ready: useSublaySelector(selectAccountsReady),
      }),
      {
        wrapper: ({ children }) => (
          <Provider store={externalStore}>
            <SublayIntegrationProvider projectId="test-project">
              <>
                <AccountManagerLike />
                {children}
              </>
            </SublayIntegrationProvider>
          </Provider>
        ),
      },
    );

    // Reloads.
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.accounts["user-1"]?.user.username).toBe("alice");
    expect(result.current.refreshToken).toBe("stored-refresh-token");

    // Persists.
    externalStore.dispatch(
      setDeviceIdentifier({ platform: "ios", token: "apns-token" }),
    );
    await waitFor(() => expect(storage.setAccountMap).toHaveBeenCalled());
    const calls = (storage.setAccountMap as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[calls.length - 1][1].deviceIdentifier).toEqual({
      platform: "ios",
      token: "apns-token",
    });
  });

  it("with no AccountManager, initializes cleanly and the awaitable persist is a clean no-op", async () => {
    // `@sublay/core` used directly with no platform package is a genuinely
    // storage-less configuration. It must neither hang nor throw.
    const axiosPublic = mockAxiosPublic();
    axiosPublic.mockResponse("get", { id: "test-project", integrations: [] });

    const externalStore = configureStore({
      reducer: { sublay: sublayReducers, sublayApi: sublayApiReducer },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(...sublayMiddleware),
    });

    const { result } = renderHook(
      () => useSublaySelector(selectInitialized),
      {
        wrapper: ({ children }) => (
          <Provider store={externalStore}>
            <SublayIntegrationProvider projectId="test-project">
              {children}
            </SublayIntegrationProvider>
          </Provider>
        ),
      },
    );

    await waitFor(() => expect(result.current).toBe(true));
    await expect(
      persistAccountMapFor("test-project", {
        activeAccountId: null,
        accounts: {},
        signedOut: false,
      }),
    ).resolves.toBeUndefined();
  });
});
