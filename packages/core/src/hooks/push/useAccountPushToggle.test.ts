import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { act, waitFor } from "@testing-library/react";

import { renderHookWithAxios, resetAxiosMocks } from "../../test-utils";
import {
  setAccountMap,
  type AccountEntry,
} from "../../store/slices/accountsSlice";
import {
  registerAccountStorage,
  resetAccountStorage,
} from "../../config/accountStorage";
import { resetAccountTokenMints } from "./mintAccountAccessToken";
import useAccountPushToggle from "./useAccountPushToggle";

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
  };
}

beforeEach(() => {
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

function render() {
  const rendered = renderHookWithAxios(() => useAccountPushToggle(), {
    accessToken: "access-1",
    refreshToken: "refresh-1",
  });
  act(() => {
    rendered.store.dispatch(
      setAccountMap({
        activeAccountId: "user-1",
        accounts: makeAccounts(),
        deviceIdentifier: DEVICE,
      }),
    );
  });
  return rendered;
}

describe("useAccountPushToggle", () => {
  it("silences a NON-ACTIVE account server-side without switching to it", async () => {
    const { result, store, axiosPublic } = render();
    axiosPublic.mockResponse("post", {
      accessToken: "access-2",
      refreshToken: "refresh-2-successor",
    });
    axiosPublic.mockResponse("delete", {});

    await act(async () => {
      await result.current.setAccountPushEnabled({
        userId: "user-2",
        enabled: false,
      });
    });

    const [del] = axiosPublic.calls("delete");
    expect(del.url).toBe("/test-project/push-notifications/devices");
    expect(del.config?.headers.Authorization).toBe("Bearer access-2");

    const state = store.getState();
    expect(state.sublay.accounts.accounts["user-2"].pushEnabled).toBe(false);
    // No switch: the active account is untouched.
    expect(state.sublay.accounts.activeAccountId).toBe("user-1");
    expect(state.sublay.auth.accessToken).toBe("access-1");
  });

  it("writes the flag only AFTER the binding change succeeds", async () => {
    const { result, store, axiosPublic } = render();
    axiosPublic.mockError("delete", 500, { message: "nope" });

    await expect(
      result.current.setAccountPushEnabled({
        userId: "user-1",
        enabled: false,
      }),
    ).rejects.toBeTruthy();

    // Previous value stands. The hook never reports an account as enabled while
    // nothing is bound, and never as silenced while a binding survives.
    expect(
      store.getState().sublay.accounts.accounts["user-1"].pushEnabled,
    ).toBeUndefined();
    await waitFor(() => expect(result.current.error).toBeTruthy());
  });

  it("re-enables an account by binding first, then writing the flag", async () => {
    const { result, store, axiosPublic } = render();
    act(() => {
      store.dispatch(
        setAccountMap({
          activeAccountId: "user-1",
          accounts: {
            ...makeAccounts(),
            "user-1": { ...makeAccounts()["user-1"], pushEnabled: false },
          },
          deviceIdentifier: DEVICE,
        }),
      );
    });
    axiosPublic.mockResponse("post", {});

    await act(async () => {
      await result.current.setAccountPushEnabled({
        userId: "user-1",
        enabled: true,
      });
    });

    const [post] = axiosPublic.calls("post");
    expect(post.url).toBe("/test-project/push-notifications/devices");
    expect(post.body).toEqual(DEVICE);
    expect(store.getState().sublay.accounts.accounts["user-1"].pushEnabled).toBe(
      true,
    );
  });

  it("reads absent as enabled", () => {
    const { result } = render();
    expect(result.current.isAccountPushEnabled("user-2")).toBe(true);
    expect(result.current.isAccountPushEnabled("user-missing")).toBe(false);
  });

  it("clears a stale needs-re-binding marker once the binding matches intent", async () => {
    // A marked background account that the user then SILENCES. The toggle
    // unbinds it directly against the current identifier, so there is nothing
    // left to repair — and the marker's only other clearing point is the
    // activation-time reconcile, which for a silenced account does the same
    // unbind. Left standing, it would report "notifications paused" forever on
    // an account the user deliberately turned off.
    const { result, store, axiosPublic } = render();
    act(() => {
      store.dispatch(
        setAccountMap({
          activeAccountId: "user-1",
          accounts: {
            ...makeAccounts(),
            "user-2": {
              ...makeAccounts()["user-2"],
              pushEnabled: true,
              needsPushRebind: true,
            },
          },
          deviceIdentifier: DEVICE,
        }),
      );
    });
    axiosPublic.mockResponse("post", {
      accessToken: "access-2",
      refreshToken: "refresh-2-successor",
    });
    axiosPublic.mockResponse("delete", {});

    await act(async () => {
      await result.current.setAccountPushEnabled({
        userId: "user-2",
        enabled: false,
      });
    });

    const entry = store.getState().sublay.accounts.accounts["user-2"];
    expect(entry.pushEnabled).toBe(false);
    expect(entry.needsPushRebind).toBeUndefined();
  });

  it("throws for an unknown account", async () => {
    const { result } = render();
    await expect(
      result.current.setAccountPushEnabled({
        userId: "user-missing",
        enabled: false,
      }),
    ).rejects.toThrow("Account user-missing not found");
  });
});
