import { describe, it, expect, afterEach } from "vitest";

import {
  makeSublayStore,
  mockAxiosPublic,
  resetAxiosMocks,
} from "../../test-utils";
import {
  activateStoredAccount,
  AccountTransitionError,
} from "./accountTransition";
import {
  mintAccountAccessToken,
  resetAccountTokenMints,
} from "../push/mintAccountAccessToken";
import { setAccountMap } from "../../store/slices/accountsSlice";
import { setTokens, setInitialized } from "../../store/slices/authSlice";
import { setUnreadSummary } from "../../store/slices/chatSlice";
import type { AccountEntry } from "../../store/slices/accountsSlice";

afterEach(() => {
  resetAxiosMocks();
  resetAccountTokenMints();
});

function makeAccounts(): Record<string, AccountEntry> {
  return {
    "user-1": {
      refreshToken: "refresh-1",
      tokenExpiresAt: 0,
      user: { id: "user-1", name: "Alice", email: null, avatar: null },
    },
    "user-2": {
      refreshToken: "refresh-2",
      tokenExpiresAt: 0,
      user: { id: "user-2", name: "Bob", email: null, avatar: null },
    },
  };
}

/** A store standing in for "user-1 is signed in and everything is fine". */
function makeLiveStore() {
  const store = makeSublayStore();
  store.dispatch(
    setAccountMap({ activeAccountId: "user-1", accounts: makeAccounts() })
  );
  store.dispatch(
    setTokens({ accessToken: "access-1", refreshToken: "refresh-1" })
  );
  store.dispatch(setInitialized(true));
  return store;
}

/**
 * These exercise the transition core through a bare store and a bare
 * `dispatch` — no `renderHook`, no React at all. That is the point of the
 * extraction: `oauthCore` and the auth thunk bodies both need this sequence and
 * neither can call a hook.
 */
describe("activateStoredAccount (callable outside React)", () => {
  it("selects the account and establishes its session", async () => {
    const store = makeLiveStore();
    const axios = mockAxiosPublic();
    axios.mockResponse("post", {
      accessToken: "access-2",
      refreshToken: "refresh-2-rotated",
      user: { id: "user-2" },
    });

    const token = await activateStoredAccount({
      dispatch: store.dispatch,
      getState: () => store.getState(),
      projectId: "project-1",
      userId: "user-2",
      refreshToken: "refresh-2",
      previousActiveAccountId: "user-1",
    });

    expect(token).toBe("access-2");
    const state = store.getState();
    expect(state.sublay.accounts.activeAccountId).toBe("user-2");
    expect(state.sublay.auth.accessToken).toBe("access-2");
    // The SUCCESSOR, not the token that was presented — that one is revoked.
    expect(state.sublay.auth.refreshToken).toBe("refresh-2-rotated");
    expect(state.sublay.accounts.accounts["user-2"].refreshToken).toBe(
      "refresh-2-rotated"
    );
    expect(state.sublay.auth.initialized).toBe(true);
    expect(state.sublay.accounts.signedOut).toBe(false);

    const [call] = axios.calls("post");
    expect(call.url).toBe("/project-1/auth/request-new-access-token");
    // The TARGET account's token, not the active one's.
    expect(call.body).toEqual({ refreshToken: "refresh-2" });
  });

  // The refresh exchange ROTATES: presenting a token revokes it. Validating
  // before committing moved the exchange earlier — it must not have ADDED one.
  // The validate step IS the session-establishing exchange.
  it("spends exactly one token exchange", async () => {
    const store = makeLiveStore();
    const axios = mockAxiosPublic();
    axios.mockResponse("post", {
      accessToken: "access-2",
      refreshToken: "refresh-2-rotated",
      user: { id: "user-2" },
    });

    await activateStoredAccount({
      dispatch: store.dispatch,
      getState: () => store.getState(),
      projectId: "project-1",
      userId: "user-2",
      refreshToken: "refresh-2",
      previousActiveAccountId: "user-1",
    });

    expect(axios.calls("post")).toHaveLength(1);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // THE POST-INSTALL WINDOW, end to end.
  //
  // A per-account push toggle — or a SECOND TAP ON THE SAME SWITCHER — can be
  // minting for the very account being switched into: it is non-active on both
  // sides, so both compute the same single-flight key. The dangerous ordering
  // is the one where the second ask lands AFTER the exchange settles but BEFORE
  // the install: it presents the successor the transition is about to install
  // and rotates again, leaving the live session holding a revoked token while
  // the map holds its replacement. The next ordinary refresh then trips reuse
  // detection and destroys the family.
  //
  // The racer is fired from inside the window rather than raced into it. The
  // transition's teardown dispatch is the first thing that happens after the
  // exchange has settled and the last thing before the install, so hooking it
  // puts the second ask exactly where it hurts — deterministically, instead of
  // depending on how many microtasks each entry point happens to cost.
  //
  // Two responses are queued deliberately: without the lease this test would
  // not error, it would quietly end with `auth.refreshToken` and the map's copy
  // disagreeing.
  // ─────────────────────────────────────────────────────────────────────────
  it("cannot be rotated behind by a mint that lands inside the install window", async () => {
    const store = makeLiveStore();
    const axios = mockAxiosPublic();
    axios.mockResponse("post", {
      accessToken: "access-2",
      refreshToken: "refresh-2-rotated",
      user: { id: "user-2" },
    });
    axios.mockResponse("post", {
      accessToken: "access-2b",
      refreshToken: "refresh-2-rotated-again",
      user: { id: "user-2" },
    });

    const mintArgs = {
      dispatch: store.dispatch as never,
      getState: () => store.getState(),
      projectId: "project-1",
      userId: "user-2",
    };

    let racing: Promise<string> | null = null;
    const dispatch = ((action: { type?: string }) => {
      const result = (store.dispatch as (a: unknown) => unknown)(action);
      if (!racing && action?.type === "auth/resetAuth") {
        racing = mintAccountAccessToken(mintArgs);
      }
      return result;
    }) as unknown as typeof store.dispatch;

    await activateStoredAccount({
      dispatch,
      getState: () => store.getState(),
      projectId: "project-1",
      userId: "user-2",
      refreshToken: "refresh-2",
      previousActiveAccountId: "user-1",
    });

    // The racer really did fire inside the window — without this the test would
    // pass vacuously if the teardown dispatch were ever reordered away.
    expect(racing).not.toBeNull();
    await racing;

    const state = store.getState();
    // One exchange for the whole convoy — the second response was never used.
    expect(axios.calls("post")).toHaveLength(1);
    // THE INVARIANT: the live session's credential is the one the map holds.
    // Anything else means the next refresh presents a revoked token.
    expect(state.sublay.auth.refreshToken).toBe("refresh-2-rotated");
    expect(state.sublay.accounts.accounts["user-2"].refreshToken).toBe(
      state.sublay.auth.refreshToken
    );
  });

  it("clears the outgoing account's feature state", async () => {
    const store = makeLiveStore();
    store.dispatch(
      setUnreadSummary({ totalUnread: 9, unreadConversationCount: 4 })
    );
    const axios = mockAxiosPublic();
    axios.mockResponse("post", {
      accessToken: "access-2",
      refreshToken: "refresh-2-rotated",
      user: { id: "user-2" },
    });

    await activateStoredAccount({
      dispatch: store.dispatch,
      getState: () => store.getState(),
      projectId: "project-1",
      userId: "user-2",
      refreshToken: "refresh-2",
      previousActiveAccountId: "user-1",
    });

    expect(store.getState().sublay.chat.unreadConversationCount).toBeNull();
  });

  // INVERTED (validate-before-commit). This test used to be titled "rejects and
  // restores the previous SELECTION when the refresh fails" and asserted that
  // the previous account was selected again with `accessToken`/`refreshToken`
  // both null — i.e. that switching to a dead account signed the user out of
  // the perfectly good account they were using. That was the honest description
  // of teardown-first, and it is the bug this phase removes: the credential is
  // now proven before anything is torn down, so a failure changes nothing.
  it("leaves the current session completely intact when the target's credential is dead", async () => {
    const store = makeLiveStore();
    store.dispatch(
      setUnreadSummary({ totalUnread: 9, unreadConversationCount: 4 })
    );
    const axios = mockAxiosPublic();
    axios.mockError("post", 403, { error: "Refresh token revoked" });

    await expect(
      activateStoredAccount({
        dispatch: store.dispatch,
        getState: () => store.getState(),
        projectId: "project-1",
        userId: "user-2",
        refreshToken: "refresh-2",
        previousActiveAccountId: "user-1",
      })
    ).rejects.toBeInstanceOf(AccountTransitionError);

    const state = store.getState();
    // Still signed in as user-1 — selection, tokens, gate and cached feature
    // state all untouched.
    expect(state.sublay.accounts.activeAccountId).toBe("user-1");
    expect(state.sublay.auth.accessToken).toBe("access-1");
    expect(state.sublay.auth.refreshToken).toBe("refresh-1");
    expect(state.sublay.auth.initialized).toBe(true);
    expect(state.sublay.accounts.signedOut).toBe(false);
    expect(state.sublay.chat.unreadConversationCount).toBe(4);
    // Both entries survive — the failed one is the affordance for a re-auth.
    expect(Object.keys(state.sublay.accounts.accounts).sort()).toEqual([
      "user-1",
      "user-2",
    ]);
    // ...and it is now MARKED, so a switcher can show it as dead before the
    // user taps it again.
    expect(state.sublay.accounts.accounts["user-2"].needsReauth).toBe(true);
    expect(state.sublay.accounts.accounts["user-1"].needsReauth).toBeUndefined();
  });

  it("carries the server's reason on the rejection", async () => {
    const store = makeLiveStore();
    const axios = mockAxiosPublic();
    axios.mockError("post", 401, { error: "Refresh token revoked" });

    await expect(
      activateStoredAccount({
        dispatch: store.dispatch,
        getState: () => store.getState(),
        projectId: "project-1",
        userId: "user-2",
        refreshToken: "refresh-2",
        previousActiveAccountId: "user-1",
      })
    ).rejects.toThrow("Refresh token revoked");
  });

  // A flaky network is not a dead account. Marking `needsReauth` here would
  // tell users to sign in again every time they lost signal.
  it("does not mark needsReauth when the exchange fails for a transport reason", async () => {
    const store = makeLiveStore();
    const axios = mockAxiosPublic();
    axios.mockNetworkError("post");

    await expect(
      activateStoredAccount({
        dispatch: store.dispatch,
        getState: () => store.getState(),
        projectId: "project-1",
        userId: "user-2",
        refreshToken: "refresh-2",
        previousActiveAccountId: "user-1",
      })
    ).rejects.toBeInstanceOf(AccountTransitionError);

    const state = store.getState();
    expect(state.sublay.accounts.accounts["user-2"].needsReauth).toBeUndefined();
    // Still fully intact either way.
    expect(state.sublay.accounts.activeAccountId).toBe("user-1");
    expect(state.sublay.auth.accessToken).toBe("access-1");
  });

  it("clears a stale needsReauth marker on a successful activation", async () => {
    const store = makeLiveStore();
    const accounts = makeAccounts();
    accounts["user-2"] = { ...accounts["user-2"], needsReauth: true };
    store.dispatch(
      setAccountMap({ activeAccountId: "user-1", accounts })
    );
    const axios = mockAxiosPublic();
    axios.mockResponse("post", {
      accessToken: "access-2",
      refreshToken: "refresh-2-rotated",
      user: { id: "user-2" },
    });

    await activateStoredAccount({
      dispatch: store.dispatch,
      getState: () => store.getState(),
      projectId: "project-1",
      userId: "user-2",
      refreshToken: "refresh-2",
      previousActiveAccountId: "user-1",
    });

    expect(
      store.getState().sublay.accounts.accounts["user-2"].needsReauth
    ).toBeUndefined();
  });

  it("rejects with AccountTransitionError when the entry has no refresh token", async () => {
    // A corrupt map — an interrupted write, a hand-composed entry. It never
    // reaches the network, so a guard that waits for a request to fail would
    // report success. Failing here also means nothing was torn down.
    const store = makeLiveStore();
    const axios = mockAxiosPublic();

    await expect(
      activateStoredAccount({
        dispatch: store.dispatch,
        getState: () => store.getState(),
        projectId: "project-1",
        userId: "user-2",
        refreshToken: "",
        previousActiveAccountId: "user-1",
      })
    ).rejects.toBeInstanceOf(AccountTransitionError);

    const state = store.getState();
    expect(axios.calls("post")).toHaveLength(0);
    expect(state.sublay.accounts.activeAccountId).toBe("user-1");
    expect(state.sublay.auth.accessToken).toBe("access-1");
    // An entry with no credential IS an entry that needs a re-auth.
    expect(state.sublay.accounts.accounts["user-2"].needsReauth).toBe(true);
  });

  it("marks the state signed-out when a failed transition had no previous selection", async () => {
    const store = makeSublayStore();
    store.dispatch(
      setAccountMap({ activeAccountId: null, accounts: makeAccounts() })
    );
    const axios = mockAxiosPublic();
    axios.mockError("post", 403, { error: "Refresh token revoked" });

    await expect(
      activateStoredAccount({
        dispatch: store.dispatch,
        getState: () => store.getState(),
        projectId: "project-1",
        userId: "user-2",
        refreshToken: "refresh-2",
      })
    ).rejects.toBeInstanceOf(Error);

    const state = store.getState();
    expect(state.sublay.accounts.activeAccountId).toBeNull();
    // Nothing was at stake, so nothing was protected — but the next launch must
    // not silently activate the first stored account instead.
    expect(state.sublay.accounts.signedOut).toBe(true);
  });
});
