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
  it("clears auth/user state and the active account to surface the sign-in UI", () => {
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
    expect(store.getState().sublay.accounts.activeAccountId).toBeNull();
    // Existing accounts in the map are left untouched.
    expect(Object.keys(store.getState().sublay.accounts.accounts)).toHaveLength(1);
    // ...and the outgoing account's feature state does not survive into the
    // account the user is about to sign into.
    expect(store.getState().sublay.chat.unreadConversationCount).toBeNull();
  });

  it("records leaving as deliberate, so an ABANDONED flow does not activate another account", () => {
    // `activeAccountId: null` means both "nobody has ever picked" and "the
    // session was intentionally ended", and only the first should fall back to
    // a stored account. Without the flag, a user who backs out of the sign-in
    // screen and quits is silently signed into the OLDEST remembered account on
    // the next launch — `useAccountSync` Phase A's first-account fallback.
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

    expect(store.getState().sublay.accounts.activeAccountId).toBeNull();
    expect(store.getState().sublay.accounts.signedOut).toBe(true);
    // The entries survive — the whole point is that the other accounts are
    // still there to switch back into.
    expect(
      Object.keys(store.getState().sublay.accounts.accounts),
    ).toHaveLength(2);
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
    const { result, store } = renderHookWithAxios(() => useAddAccount());
    act(() => {
      store.dispatch(
        setAccountMap({ activeAccountId: "user-0", accounts: makeAccounts(MAX_ACCOUNTS) }),
      );
    });

    expect(result.current.canAddAccount).toBe(false);

    act(() => {
      result.current.addAccount();
    });

    // Nothing was reset since the cap was already reached.
    expect(store.getState().sublay.accounts.activeAccountId).toBe("user-0");
  });
});
