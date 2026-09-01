import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { act, waitFor } from "@testing-library/react";

import { renderHookWithAxios, resetAxiosMocks } from "../../test-utils";
import {
  setAccountMap,
  type AccountEntry,
  type AccountMap,
} from "../../store/slices/accountsSlice";
import {
  registerAccountStorage,
  resetAccountStorage,
} from "../../config/accountStorage";
import { resetAccountTokenMints } from "./mintAccountAccessToken";
import useAccountPushToggle from "./useAccountPushToggle";
import { AccountTransitionError } from "../auth/accountTransition";

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

/**
 * The registered storage, with its writes held open on demand.
 *
 * `writes` records the maps that reached the adapter — the durability of the
 * flag is a claim about STORAGE, so it has to be asserted there and not on the
 * Redux value the next relaunch never reads.
 */
let storageWrites: AccountMap[];
let holdWrites: (() => void) | null;

beforeEach(() => {
  resetAccountTokenMints();
  storageWrites = [];
  holdWrites = null;
  registerAccountStorage(
    {
      getAccountMap: vi.fn().mockResolvedValue(null),
      setAccountMap: vi.fn(async (_projectId: string, map: AccountMap) => {
        storageWrites.push(JSON.parse(JSON.stringify(map)) as AccountMap);
        if (holdWrites) {
          await new Promise<void>((resolve) => {
            holdWrites = resolve;
          });
        }
      }),
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

    // DURABLE, which is the entire point of the flag: the next launch reads it
    // from storage, and reconciliation acts on what it finds there. A Redux-only
    // write leaves the account silenced until the app is closed and unsilenced
    // the moment it reopens.
    expect(storageWrites).not.toHaveLength(0);
    expect(
      storageWrites[storageWrites.length - 1].accounts["user-2"].pushEnabled,
    ).toBe(false);
  });

  it("does not resolve until the silenced flag has actually been stored", async () => {
    // The other half, and it deletes just as green: `persistAccountMapFor`
    // without an `await` reports the change complete while the write is still
    // in flight — and the write contract REJECTS on failure, so an unawaited
    // one swallows exactly the failure that decides whether the account is
    // silenced on the next launch.
    // The ACTIVE account deliberately: a non-active one mints first, and the
    // mint persists its rotated credential through this same storage — so
    // holding "the write" would hold the mint's and prove nothing about the
    // toggle's. Here the toggle's persist is the only write there is.
    const { result, axiosPublic } = render();
    axiosPublic.mockResponse("delete", {});
    holdWrites = () => {};

    let settled = false;
    const pending = result.current
      .setAccountPushEnabled({ userId: "user-1", enabled: false })
      .then(() => {
        settled = true;
      });

    // The write has reached the adapter, carrying the silenced flag, and is
    // being held open.
    await waitFor(() =>
      expect(
        storageWrites.some(
          (map) => map.accounts["user-1"]?.pushEnabled === false,
        ),
      ).toBe(true),
    );
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(settled).toBe(false);

    // Release it; only now may the caller be told the change is done.
    (holdWrites as unknown as () => void)();
    await pending;
    expect(settled).toBe(true);
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

    let applied!: boolean;
    await act(async () => {
      applied = await result.current.setAccountPushEnabled({
        userId: "user-2",
        enabled: false,
      });
    });

    // Surfaced to the caller, not just used internally to decide the marker:
    // this is the exact value that lets an app tell "repaired" from "there
    // was nothing to repair" without diffing `needsPushRebind` itself.
    expect(applied).toBe(true);

    const entry = store.getState().sublay.accounts.accounts["user-2"];
    expect(entry.pushEnabled).toBe(false);
    expect(entry.needsPushRebind).toBeUndefined();
  });

  it("leaves the marker standing when there was no binding call to make", async () => {
    // The other half of the rule above, and the one that used to be wrong: with
    // NO device identifier `applyAccountPushBinding` returns without a request,
    // so nothing has been bound or unbound — and clearing the marker off that
    // would report a repair that never happened, silently, with no route back.
    //
    // Seeded directly, because the public API cannot currently produce this
    // pair: every writer of `needsPushRebind: true` is gated on an identifier
    // being present, and nothing ever nulls one back out. `setAccountMap` is
    // the seam — it writes a persisted identifier verbatim at hydration with no
    // cross-check against the markers, so a cross-version or hand-edited
    // payload can arrive in exactly this shape.
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
          // No identifier: this device has never registered.
          deviceIdentifier: null,
        }),
      );
    });

    let applied!: boolean;
    await act(async () => {
      applied = await result.current.setAccountPushEnabled({
        userId: "user-2",
        enabled: false,
      });
    });

    // The other half: a caller checking the resolved value directly gets the
    // right answer without inferring it from the marker, which is exactly
    // the workaround this return value exists to remove.
    expect(applied).toBe(false);

    // Nothing went out — not even the mint a non-active account would need.
    expect(axiosPublic.calls("delete")).toHaveLength(0);
    expect(axiosPublic.calls("post")).toHaveLength(0);

    const entry = store.getState().sublay.accounts.accounts["user-2"];
    // The FLAG is written: it is durable intent for the next `register()`, and
    // with nothing bound there is no server state to misreport.
    expect(entry.pushEnabled).toBe(false);
    // The MARKER is not: it is a claim about a binding, and no binding changed.
    expect(entry.needsPushRebind).toBe(true);
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

  it("types the unknown-account failure as AccountTransitionError with accountNotFound", async () => {
    // The third hook that can be handed a stale id, and it used to be the one
    // that threw a bare `Error` — so a caller branching on
    // `err.accountNotFound` fell through to its generic branch here alone.
    const { result } = render();

    const error = await result.current
      .setAccountPushEnabled({ userId: "user-missing", enabled: false })
      .then(
        () => null,
        (err: unknown) => err,
      );

    expect(error).toBeInstanceOf(AccountTransitionError);
    expect((error as AccountTransitionError).accountNotFound).toBe(true);
    expect((error as AccountTransitionError).credentialRejected).toBe(false);
  });
});
