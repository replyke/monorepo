import { describe, it, expect } from "vitest";
import { act } from "@testing-library/react";

import { renderHookWithAxios } from "../../test-utils";
import useAccounts from "./useAccounts";
import { setAccountMap } from "../../store/slices/accountsSlice";

describe("useAccounts", () => {
  it("returns an empty list and null active account when there are none", () => {
    const { result } = renderHookWithAxios(() => useAccounts());

    expect(result.current.accounts).toEqual([]);
    expect(result.current.activeAccount).toBeNull();
    expect(result.current.accountCount).toBe(0);
  });

  it("derives account summaries and the active account from the accounts map", () => {
    const { result, store } = renderHookWithAxios(() => useAccounts());

    act(() => {
      store.dispatch(
        setAccountMap({
          activeAccountId: "user-1",
          accounts: {
            "user-1": {
              refreshToken: "token-1",
              tokenExpiresAt: 0,
              user: { id: "user-1", name: "Alice", email: null, avatar: null },
            },
            "user-2": {
              refreshToken: "token-2",
              tokenExpiresAt: 0,
              user: { id: "user-2", name: "Bob", email: null, avatar: null },
            },
          },
        }),
      );
    });

    expect(result.current.accountCount).toBe(2);
    expect(result.current.accounts.map((a) => a.id)).toEqual(["user-1", "user-2"]);
    expect(result.current.activeAccount).toEqual({
      id: "user-1",
      name: "Alice",
      email: null,
      avatar: null,
      // The health markers ride on every listed account so a switcher can tell
      // a live entry from a dead one BEFORE the user taps it, and can say
      // "notifications paused" without implying anything is wrong with the
      // account itself.
      tokenExpiresAt: 0,
      needsReauth: false,
      needsPushRebind: false,
    });
  });

  it("surfaces both re-auth markers per account", () => {
    const { result, store } = renderHookWithAxios(() => useAccounts());

    act(() => {
      store.dispatch(
        setAccountMap({
          activeAccountId: "user-1",
          accounts: {
            "user-1": {
              refreshToken: "token-1",
              tokenExpiresAt: 4102444800000,
              user: { id: "user-1", name: "Alice", email: null, avatar: null },
            },
            // Expiry says fine; the server already said otherwise. This is the
            // pair's whole reason to exist: reuse detection, a password change
            // or a remote sign-out-all kills the family while `exp` is still
            // far in the future.
            "user-2": {
              refreshToken: "token-2",
              tokenExpiresAt: 4102444800000,
              needsReauth: true,
              user: { id: "user-2", name: "Bob", email: null, avatar: null },
            },
            // ...and the converse: nothing has failed yet, but the token is
            // already past its own expiry.
            "user-3": {
              refreshToken: "token-3",
              tokenExpiresAt: 1,
              user: { id: "user-3", name: "Cleo", email: null, avatar: null },
            },
          },
        }),
      );
    });

    const byId = Object.fromEntries(
      result.current.accounts.map((account) => [account.id, account]),
    );

    expect(byId["user-1"].needsReauth).toBe(false);
    expect(byId["user-1"].tokenExpiresAt).toBe(4102444800000);
    expect(byId["user-2"].needsReauth).toBe(true);
    expect(byId["user-3"].needsReauth).toBe(false);
    expect(byId["user-3"].tokenExpiresAt).toBe(1);
    expect(result.current.activeAccount?.needsReauth).toBe(false);
  });

  it("surfaces the needs-re-binding marker, distinctly from needsReauth", () => {
    // The two mean opposite things about whether the user has to do anything
    // hard. `needsReauth` says the credential is dead — sign in again.
    // `needsPushRebind` says the credential is fine and only the notification
    // routing is stale — open the account and it repairs itself. Rendering one
    // as the other is wrong in both directions: asking for a password nobody
    // needs, or hiding the one tap that would fix it.
    const { result, store } = renderHookWithAxios(() => useAccounts());

    act(() => {
      store.dispatch(
        setAccountMap({
          activeAccountId: "user-1",
          accounts: {
            "user-1": {
              refreshToken: "token-1",
              tokenExpiresAt: 4102444800000,
              user: { id: "user-1", name: "Alice", email: null, avatar: null },
            },
            // Notifications paused: this device's push token moved on while
            // this account was in the background.
            "user-2": {
              refreshToken: "token-2",
              tokenExpiresAt: 4102444800000,
              needsPushRebind: true,
              user: { id: "user-2", name: "Bob", email: null, avatar: null },
            },
            // Dead credential — and its notifications are not the problem.
            "user-3": {
              refreshToken: "token-3",
              tokenExpiresAt: 4102444800000,
              needsReauth: true,
              user: { id: "user-3", name: "Cleo", email: null, avatar: null },
            },
          },
        }),
      );
    });

    const byId = Object.fromEntries(
      result.current.accounts.map((account) => [account.id, account]),
    );

    expect(byId["user-1"].needsPushRebind).toBe(false);
    expect(byId["user-1"].needsReauth).toBe(false);

    expect(byId["user-2"].needsPushRebind).toBe(true);
    expect(byId["user-2"].needsReauth).toBe(false);

    expect(byId["user-3"].needsPushRebind).toBe(false);
    expect(byId["user-3"].needsReauth).toBe(true);
  });
});
