import { describe, it, expect } from "vitest";
import { act } from "@testing-library/react";

import { renderHookWithAxios, makeAuthUser } from "../../test-utils";
import useAddAccount from "./useAddAccount";
import {
  setAccountMap,
  setAccountLimitReached,
  MAX_ACCOUNTS,
  type AccountEntry,
} from "../../store/slices/accountsSlice";
import { setUnreadSummary } from "../../store/slices/chatSlice";
import { setUser as setUserInUserSlice } from "../../store/slices/userSlice";

function makeAccounts(count: number): Record<string, AccountEntry> {
  const accounts: Record<string, AccountEntry> = {};
  for (let i = 0; i < count; i++) {
    accounts[`user-${i}`] = {
      refreshToken: `token-${i}`,
      tokenExpiresAt: 0,
      user: { id: `user-${i}`, name: null, email: null, avatar: null },
    };
  }
  return accounts;
}

describe("useAddAccount", () => {
  it("clears auth/user state to surface the sign-in UI, and leaves the shared map alone", () => {
    const user = makeAuthUser({ id: "user-1" });
    const { result, store } = renderHookWithAxios(() => useAddAccount(), {
      user,
      accessToken: "access-1",
      refreshToken: "refresh-1",
    });
    act(() => {
      store.dispatch(setUserInUserSlice(user));
      store.dispatch(setAccountMap({ activeAccountId: "user-1", accounts: makeAccounts(1) }));
    });

    expect(result.current.canAddAccount).toBe(true);

    act(() => {
      result.current.addAccount();
    });

    expect(store.getState().sublay.auth.accessToken).toBeNull();
    expect(store.getState().sublay.auth.refreshToken).toBeNull();
    expect(store.getState().sublay.auth.user).toBeNull();
    expect(store.getState().sublay.user.user).toBeNull();
    // ...and the PERSISTED, CROSS-TAB-BROADCAST map is untouched: the selection
    // still names the account the user stepped out of, and nothing claims a
    // sign-out. Writing either of those here signed every other tab out.
    expect(store.getState().sublay.accounts.activeAccountId).toBe("user-1");
    expect(store.getState().sublay.accounts.signedOut).toBe(false);
    // Existing accounts in the map are left untouched.
    expect(Object.keys(store.getState().sublay.accounts.accounts)).toHaveLength(1);
    // ...and the outgoing account's feature state does not survive into the
    // account the user is about to sign into.
    expect(store.getState().sublay.chat.unreadConversationCount).toBeNull();
  });

  it("does NOT record a sign-out — an ABANDONED flow returns to the account the user was in", () => {
    // This used to dispatch `setActiveAccount(null)` + `setSignedOut(true)` so
    // that Phase A's first-account fallback would not drop an abandoning user
    // into the OLDEST remembered account on the next launch. Both writes land
    // in the PERSISTED map, which `useAccountSync` Phase D broadcasts to every
    // other tab — where "nobody is active" reads as a sign-out and tears that
    // tab's live session down.
    //
    // Leaving the selection alone fixes the launch bug more directly: there is
    // no ambiguous null for Phase A to resolve, so it restores `user-1` — the
    // account the user actually stepped out of, never `user-0`.
    const { result, store } = renderHookWithAxios(() => useAddAccount(), {
      accessToken: "access-1",
      refreshToken: "refresh-1",
    });
    act(() => {
      store.dispatch(
        setAccountMap({
          activeAccountId: "user-1",
          accounts: makeAccounts(2),
          signedOut: false,
        }),
      );
    });

    act(() => {
      result.current.addAccount();
    });

    expect(store.getState().sublay.accounts.activeAccountId).toBe("user-1");
    expect(store.getState().sublay.accounts.signedOut).toBe(false);
    // The entries survive — the whole point is that the other accounts are
    // still there to switch back into.
    expect(
      Object.keys(store.getState().sublay.accounts.accounts),
    ).toHaveLength(2);
    // The local session IS gone, which is what surfaces the sign-in screen.
    expect(store.getState().sublay.auth.accessToken).toBeNull();
    expect(store.getState().sublay.auth.refreshToken).toBeNull();
  });

  it("clears account-scoped feature state", () => {
    const { result, store } = renderHookWithAxios(() => useAddAccount());
    act(() => {
      store.dispatch(setAccountMap({ activeAccountId: "user-0", accounts: makeAccounts(1) }));
      store.dispatch(setUnreadSummary({ totalUnread: 8, unreadConversationCount: 4 }));
    });
    expect(store.getState().sublay.chat.unreadConversationCount).toBe(4);

    act(() => {
      result.current.addAccount();
    });

    expect(store.getState().sublay.chat.unreadConversationCount).toBeNull();
  });

  it("surfaces accountLimitReached, distinct from canAddAccount", () => {
    const { result, store } = renderHookWithAxios(() => useAddAccount());
    act(() => {
      store.dispatch(
        setAccountMap({ activeAccountId: "user-0", accounts: makeAccounts(MAX_ACCOUNTS) }),
      );
    });

    // Room check says no, but nothing has actually been REFUSED yet.
    expect(result.current.canAddAccount).toBe(false);
    expect(result.current.accountLimitReached).toBe(false);

    act(() => {
      store.dispatch(setAccountLimitReached(true));
    });

    expect(result.current.accountLimitReached).toBe(true);
  });

  it("reports canAddAccount as false and no-ops once MAX_ACCOUNTS is reached", () => {
    const { result, store } = renderHookWithAxios(() => useAddAccount(), {
      accessToken: "access-1",
      refreshToken: "refresh-1",
    });
    act(() => {
      store.dispatch(
        setAccountMap({ activeAccountId: "user-0", accounts: makeAccounts(MAX_ACCOUNTS) }),
      );
      store.dispatch(setUnreadSummary({ totalUnread: 8, unreadConversationCount: 4 }));
    });

    expect(result.current.canAddAccount).toBe(false);

    act(() => {
      result.current.addAccount();
    });

    // Nothing was torn down, since the cap was already reached: the user is
    // still signed in where they were rather than being dropped onto a sign-in
    // screen they can never complete. (Asserted on the SESSION, not on the
    // selection — the selection is left alone on every path now.)
    expect(store.getState().sublay.auth.accessToken).toBe("access-1");
    expect(store.getState().sublay.auth.refreshToken).toBe("refresh-1");
    expect(store.getState().sublay.chat.unreadConversationCount).toBe(4);
    expect(store.getState().sublay.accounts.activeAccountId).toBe("user-0");
  });
});
