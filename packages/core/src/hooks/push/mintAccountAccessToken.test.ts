import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";

import {
  makeSublayStore,
  mockAxiosPublic,
  resetAxiosMocks,
  type SublayStore,
} from "../../test-utils";
import {
  setAccountMap,
  type AccountMap,
} from "../../store/slices/accountsSlice";
import {
  registerAccountStorage,
  resetAccountStorage,
} from "../../config/accountStorage";
import type { AccountStorage } from "../../interfaces/AccountStorage";
import {
  mintAccountAccessToken,
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
