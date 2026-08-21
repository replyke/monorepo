import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";

import {
  makeSublayStore,
  mockAxiosPublic,
  resetAxiosMocks,
  type SublayStore,
} from "../../test-utils";
import {
  setAccountMap,
  removeAccount,
  clearAllAccounts,
  type AccountMap,
} from "../../store/slices/accountsSlice";
import {
  registerAccountStorage,
  resetAccountStorage,
} from "../../config/accountStorage";
import type { AccountStorage } from "../../interfaces/AccountStorage";
import {
  mintAccountAccessToken,
  mintAccountSession,
  leaseAccountSession,
  resetAccountTokenMints,
} from "./mintAccountAccessToken";

let store: SublayStore;

function seed() {
  store = makeSublayStore();
  store.dispatch(
    setAccountMap({
      activeAccountId: "user-1",
      accounts: {
        "user-1": {
          refreshToken: "refresh-1",
          tokenExpiresAt: 0,
          user: { id: "user-1", name: null, email: null, avatar: null },
        },
        "user-2": {
          refreshToken: "refresh-2",
          tokenExpiresAt: 0,
          user: { id: "user-2", name: "Bob", email: null, avatar: null },
          pushEnabled: false,
        },
      },
    }),
  );
}

function makeStorage(
  setAccountMapImpl: (projectId: string, map: AccountMap) => Promise<void>,
): AccountStorage {
  return {
    getAccountMap: vi.fn().mockResolvedValue(null),
    setAccountMap: vi.fn(setAccountMapImpl),
    deleteAccountMap: vi.fn().mockResolvedValue(undefined),
  };
}

const ctx = () => ({
  dispatch: store.dispatch as never,
  getState: () => store.getState(),
  projectId: "test-project",
});

beforeEach(() => {
  seed();
  resetAccountTokenMints();
});

afterEach(() => {
  resetAxiosMocks();
  resetAccountStorage();
  resetAccountTokenMints();
});

describe("mintAccountAccessToken", () => {
  it("presents the TARGET account's refresh token, not the active one", async () => {
    const axiosPublic = mockAxiosPublic();
    registerAccountStorage(
      makeStorage(async () => {}),
      "test-project",
    );
    axiosPublic.mockResponse("post", {
      accessToken: "access-2",
      refreshToken: "refresh-2-successor",
    });

    const token = await mintAccountAccessToken({ ...ctx(), userId: "user-2" });

    expect(token).toBe("access-2");
    const [call] = axiosPublic.calls("post");
    expect(call.url).toBe("/test-project/auth/request-new-access-token");
    // user-1 is the ACTIVE account — the exchange must not carry its token.
    expect(call.body).toEqual({ refreshToken: "refresh-2" });
  });

  it("leaves the map holding the SUCCESSOR token", async () => {
    const axiosPublic = mockAxiosPublic();
    registerAccountStorage(
      makeStorage(async () => {}),
      "test-project",
    );
    axiosPublic.mockResponse("post", {
      accessToken: "access-2",
      refreshToken: "refresh-2-successor",
    });

    await mintAccountAccessToken({ ...ctx(), userId: "user-2" });

    const entry = store.getState().sublay.accounts.accounts["user-2"];
    expect(entry.refreshToken).toBe("refresh-2-successor");
    // A merge, not a replace: the silenced flag survives the rotation.
    expect(entry.pushEnabled).toBe(false);
    expect(entry.user.name).toBe("Bob");
  });

  it("does NOT resolve until the successor has been durably persisted", async () => {
    const axiosPublic = mockAxiosPublic();

    let releaseWrite!: () => void;
    const writeLanded = new Promise<void>((resolve) => {
      releaseWrite = resolve;
    });
    const persisted: AccountMap[] = [];

    registerAccountStorage(
      makeStorage(async (_projectId, map) => {
        persisted.push(map);
        await writeLanded;
      }),
      "test-project",
    );
    axiosPublic.mockResponse("post", {
      accessToken: "access-2",
      refreshToken: "refresh-2-successor",
    });

    let settled = false;
    const mint = mintAccountAccessToken({ ...ctx(), userId: "user-2" }).then(
      (value) => {
        settled = true;
        return value;
      },
    );

    // Give the exchange every chance to resolve early.
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // The write is in flight and the mint is NOT complete. This is the whole
    // guarantee: if the mint resolved here and the process died, the map would
    // hold a server-revoked token and the account would be destroyed on the
    // next attempt.
    expect(persisted).toHaveLength(1);
    expect(persisted[0].accounts["user-2"].refreshToken).toBe(
      "refresh-2-successor",
    );
    expect(settled).toBe(false);

    releaseWrite();
    await expect(mint).resolves.toBe("access-2");
    expect(settled).toBe(true);
  });

  it("rejects when the successor cannot be persisted", async () => {
    const axiosPublic = mockAxiosPublic();
    registerAccountStorage(
      makeStorage(async () => {
        throw new Error("keychain unavailable");
      }),
      "test-project",
    );
    axiosPublic.mockResponse("post", {
      accessToken: "access-2",
      refreshToken: "refresh-2-successor",
    });

    await expect(
      mintAccountAccessToken({ ...ctx(), userId: "user-2" }),
    ).rejects.toThrow(/could not persist/i);

    // In memory it is still the successor, so nothing later presents the
    // revoked token and Phase C gets an unawaited second attempt.
    expect(store.getState().sublay.accounts.accounts["user-2"].refreshToken).toBe(
      "refresh-2-successor",
    );
  });

  it("single-flights concurrent mints for the same account", async () => {
    const axiosPublic = mockAxiosPublic();
    registerAccountStorage(
      makeStorage(async () => {}),
      "test-project",
    );
    axiosPublic.mockResponse("post", {
      accessToken: "access-2",
      refreshToken: "refresh-2-successor",
    });

    const [a, b] = await Promise.all([
      mintAccountAccessToken({ ...ctx(), userId: "user-2" }),
      mintAccountAccessToken({ ...ctx(), userId: "user-2" }),
    ]);

    expect(a).toBe("access-2");
    expect(b).toBe("access-2");
    // Two exchanges would have presented the same refresh token twice, which is
    // the reuse-detection trigger — self-inflicted family destruction.
    expect(axiosPublic.calls("post")).toHaveLength(1);
  });

  // The two entry points share ONE single-flight entry, and that sharing is the
  // point rather than an accident: push reconciliation and an account
  // transition can both be minting for the same non-active account at the same
  // moment — a bulk reconcile after `register()` or a device-token rotation,
  // racing the user tapping "switch to that account". They compute the same
  // key, so two independent exchanges would present the same refresh token
  // twice. That IS the reuse-detection trigger.
  it("shares one exchange between mintAccountSession and mintAccountAccessToken", async () => {
    const axiosPublic = mockAxiosPublic();
    registerAccountStorage(
      makeStorage(async () => {}),
      "test-project",
    );
    axiosPublic.mockResponse("post", {
      accessToken: "access-2",
      refreshToken: "refresh-2-successor",
      user: { id: "user-2" },
    });

    const [session, token] = await Promise.all([
      mintAccountSession({ ...ctx(), userId: "user-2" }),
      mintAccountAccessToken({ ...ctx(), userId: "user-2" }),
    ]);

    expect(axiosPublic.calls("post")).toHaveLength(1);
    expect(token).toBe("access-2");
    expect(session.accessToken).toBe("access-2");
    // The LIVE token after the exchange, never the one that was presented.
    expect(session.refreshToken).toBe("refresh-2-successor");
    expect(session.user).toEqual({ id: "user-2" });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // THE POST-INSTALL WINDOW
  //
  // Releasing the flight when the exchange settles is too early. The awaiting
  // caller's continuation has not run yet, so anything asking for this account
  // in that gap starts a SECOND, perfectly legal exchange: it presents S1 (now
  // in the map) and writes S2 back. The first caller then installs S1 as the
  // live session, Phase B rebuilds the map entry from it, and the next refresh
  // presents a revoked token — reuse detection, family destroyed.
  //
  // The lease is what makes that unreachable: the flight stays closed until the
  // install has happened.
  // ─────────────────────────────────────────────────────────────────────────
  it("holds the flight open until the leaseholder releases", async () => {
    const axiosPublic = mockAxiosPublic();
    registerAccountStorage(
      makeStorage(async () => {}),
      "test-project",
    );
    axiosPublic.mockResponse("post", {
      accessToken: "access-2",
      refreshToken: "refresh-2-successor",
    });

    const lease = await leaseAccountSession({ ...ctx(), userId: "user-2" });

    // This is the reconcile arriving in the window the plain single flight left
    // open. It must be served the SAME session, not start a rotation.
    const during = await mintAccountSession({ ...ctx(), userId: "user-2" });

    expect(axiosPublic.calls("post")).toHaveLength(1);
    expect(during).toEqual(lease.session);
    // Nothing rotated behind the leaseholder: what it is about to install is
    // still what the map holds.
    expect(store.getState().sublay.accounts.accounts["user-2"].refreshToken).toBe(
      lease.session.refreshToken,
    );

    // Once released, a genuinely later caller does exchange again — the lease
    // closes a window, it does not permanently pin the account.
    lease.release();
    axiosPublic.mockResponse("post", {
      accessToken: "access-2b",
      refreshToken: "refresh-2-successor-2",
    });
    await mintAccountSession({ ...ctx(), userId: "user-2" });
    expect(axiosPublic.calls("post")).toHaveLength(2);
  });

  // The idempotence guard in `release()` only bites with MORE THAN ONE
  // leaseholder — which is exactly when it matters. With one, a double release
  // is absorbed harmlessly by `evictIfIdle`'s identity check, because the flight
  // is already out of the map. With two, a double release on A takes `holds`
  // 2 -> 1 -> 0 and evicts the flight while B is still pre-install, reopening
  // the very window the lease exists to close.
  it("a double release by one leaseholder cannot evict the flight out from under another", async () => {
    const axiosPublic = mockAxiosPublic();
    registerAccountStorage(
      makeStorage(async () => {}),
      "test-project",
    );
    // TWO responses queued up front, deliberately. If the guard is ever
    // removed, the mint below starts a real second exchange — and with a
    // response waiting for it, this test fails on the assertion that says so
    // rather than blowing up on an un-mocked request. A mutation should be
    // legible.
    axiosPublic.mockResponse("post", {
      accessToken: "access-2",
      refreshToken: "refresh-2-successor",
    });
    axiosPublic.mockResponse("post", {
      accessToken: "access-2b",
      refreshToken: "refresh-2-successor-2",
    });

    const leaseA = await leaseAccountSession({ ...ctx(), userId: "user-2" });
    const leaseB = await leaseAccountSession({ ...ctx(), userId: "user-2" });
    expect(axiosPublic.calls("post")).toHaveLength(1);

    leaseA.release();
    leaseA.release(); // the buggy second decrement

    // B has not installed yet, so the flight must still be closed: a mint
    // arriving now has to JOIN, not start a rotation behind B.
    const during = await mintAccountSession({ ...ctx(), userId: "user-2" });
    expect(axiosPublic.calls("post")).toHaveLength(1);
    expect(during).toEqual(leaseB.session);

    // ...and B's release still ends the lease properly — the guard suppresses
    // the extra decrement, it does not leak a permanent hold. This is where the
    // second queued response gets consumed.
    leaseB.release();
    await mintAccountSession({ ...ctx(), userId: "user-2" });
    expect(axiosPublic.calls("post")).toHaveLength(2);
  });

  // A joiner's hold counts too. `startOrJoin` increments synchronously, before
  // the caller awaits, so a lease taken on a flight someone else started is
  // still counted by the time the exchange asks whether it may evict.
  it("counts a lease taken on a flight another caller started", async () => {
    const axiosPublic = mockAxiosPublic();
    axiosPublic.mockResponse("post", {
      accessToken: "access-2",
      refreshToken: "refresh-2-successor",
    });

    const reconcile = mintAccountSession({ ...ctx(), userId: "user-2" });
    const leasePromise = leaseAccountSession({ ...ctx(), userId: "user-2" });

    const [, lease] = await Promise.all([reconcile, leasePromise]);
    expect(axiosPublic.calls("post")).toHaveLength(1);

    // Still held even though this caller did not start the flight.
    await mintAccountSession({ ...ctx(), userId: "user-2" });
    expect(axiosPublic.calls("post")).toHaveLength(1);

    lease.release();
  });

  it("releases its own hold when the exchange fails", async () => {
    const axiosPublic = mockAxiosPublic();
    axiosPublic.mockError("post", 403, { error: "Refresh token revoked" });

    await expect(
      leaseAccountSession({ ...ctx(), userId: "user-2" }),
    ).rejects.toBeTruthy();

    // There was no session to install, so nothing needed protecting — and the
    // flight must not be left pinned by a lease its holder never received.
    axiosPublic.mockResponse("post", { accessToken: "access-2" });
    await mintAccountSession({ ...ctx(), userId: "user-2" });
    expect(axiosPublic.calls("post")).toHaveLength(2);
  });

  it("a TIMED-OUT exchange does not poison later mints for that account", async () => {
    // The reason `config/axios` sets a timeout at all. A request that never
    // settles is never evicted from the flight map, so every later exchange for
    // this account joins the same dead promise and the lease is never released
    // — the switch spinner never stops and the account cannot be switched into
    // again without an app restart. A timeout turns "never" into a rejection,
    // and a rejection evicts.
    //
    // A timeout carries NO `response`, unlike the 403 case covered above, so it
    // travels a different shape through every error check on this path.
    const axiosPublic = mockAxiosPublic();
    axiosPublic.mockNetworkError("post", "timeout of 30000ms exceeded");

    await expect(
      mintAccountSession({ ...ctx(), userId: "user-2" }),
    ).rejects.toBeTruthy();

    axiosPublic.mockResponse("post", { accessToken: "access-2" });
    const session = await mintAccountSession({ ...ctx(), userId: "user-2" });

    expect(session.accessToken).toBe("access-2");
    // A FRESH request, not a joined dead one.
    expect(axiosPublic.calls("post")).toHaveLength(2);
  });

  it("mintAccountSession reports the presented token as live when the server did not rotate", async () => {
    const axiosPublic = mockAxiosPublic();
    axiosPublic.mockResponse("post", { accessToken: "access-2" });

    const session = await mintAccountSession({ ...ctx(), userId: "user-2" });

    expect(session.refreshToken).toBe("refresh-2");
    expect(session.user).toBeNull();
  });

  it("fails and writes NOTHING when the account was removed mid-exchange", async () => {
    // The resurrection bug. The credential write used to go through
    // `upsertAccount`, which CREATES when the key is absent — so an exchange
    // that outlived a removal put the account back, carrying a live successor
    // token and the user's summary, fully usable again. The sign-out that
    // removed it spent the OLD token, not this successor.
    const axiosPublic = mockAxiosPublic();
    registerAccountStorage(
      makeStorage(async () => {}),
      "test-project",
    );

    let respond!: (value: unknown) => void;
    const pending = new Promise((resolve) => {
      respond = resolve;
    });
    vi.spyOn(axiosPublic.instance, "post").mockImplementation(
      () => pending as never,
    );

    const minting = mintAccountSession({ ...ctx(), userId: "user-2" });

    // The user removes the account while the exchange is in flight.
    store.dispatch(removeAccount("user-2"));

    respond({
      data: {
        accessToken: "access-2",
        refreshToken: "refresh-2-successor",
        user: { id: "user-2", email: "bob@example.com" },
      },
    });

    await expect(minting).rejects.toThrow(/removed while its token exchange/i);

    // No entry, no credential, no email written back to the map.
    expect(store.getState().sublay.accounts.accounts["user-2"]).toBeUndefined();
    expect(
      Object.keys(store.getState().sublay.accounts.accounts),
    ).toEqual(["user-1"]);
  });

  it("fails and writes NOTHING when sign-out-all cleared the map mid-exchange", async () => {
    // The same hole through the other door. `clearAllAccounts` empties the map,
    // so a create-on-absent write resurrected one account out of a device the
    // user had just signed out of entirely.
    const axiosPublic = mockAxiosPublic();
    registerAccountStorage(
      makeStorage(async () => {}),
      "test-project",
    );

    let respond!: (value: unknown) => void;
    const pending = new Promise((resolve) => {
      respond = resolve;
    });
    vi.spyOn(axiosPublic.instance, "post").mockImplementation(
      () => pending as never,
    );

    const minting = mintAccountSession({ ...ctx(), userId: "user-2" });
    store.dispatch(clearAllAccounts());
    respond({
      data: { accessToken: "access-2", refreshToken: "refresh-2-successor" },
    });

    await expect(minting).rejects.toThrow(/removed while its token exchange/i);
    expect(store.getState().sublay.accounts.accounts).toEqual({});
  });

  it("does not persist to storage when the account vanished mid-exchange", async () => {
    // The write is awaited through the project mutex and is what makes a
    // rotation durable. Nothing about a removed account should reach disk.
    const axiosPublic = mockAxiosPublic();
    const setAccountMapSpy = vi.fn().mockResolvedValue(undefined);
    registerAccountStorage(makeStorage(setAccountMapSpy), "test-project");

    let respond!: (value: unknown) => void;
    const pending = new Promise((resolve) => {
      respond = resolve;
    });
    vi.spyOn(axiosPublic.instance, "post").mockImplementation(
      () => pending as never,
    );

    const minting = mintAccountSession({ ...ctx(), userId: "user-2" });
    store.dispatch(removeAccount("user-2"));
    respond({
      data: { accessToken: "access-2", refreshToken: "refresh-2-successor" },
    });

    await expect(minting).rejects.toBeTruthy();
    expect(setAccountMapSpy).not.toHaveBeenCalled();
  });

  it("refuses to persist under another project's storage slot", async () => {
    const axiosPublic = mockAxiosPublic();
    const setAccountMapSpy = vi.fn().mockResolvedValue(undefined);
    // Two providers mounted; the LAST one to mount owns the slot, and it is for
    // a different project than the one being minted for.
    registerAccountStorage(
      makeStorage(setAccountMapSpy),
      "some-other-project",
    );
    axiosPublic.mockResponse("post", {
      accessToken: "access-2",
      refreshToken: "refresh-2-successor",
    });

    await expect(
      mintAccountAccessToken({ ...ctx(), userId: "user-2" }),
    ).rejects.toThrow(/could not persist/i);

    // The successor must never land under the wrong key — that would report a
    // completed mint while leaving a server-revoked token live on disk.
    expect(setAccountMapSpy).not.toHaveBeenCalled();
  });

  it("throws without calling the network when there is no stored token", async () => {
    const axiosPublic = mockAxiosPublic();
    await expect(
      mintAccountAccessToken({ ...ctx(), userId: "user-missing" }),
    ).rejects.toThrow(/No stored refresh token/);
    expect(axiosPublic.calls("post")).toHaveLength(0);
  });
});
