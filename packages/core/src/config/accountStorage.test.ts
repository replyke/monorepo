import { describe, it, expect, afterEach, vi } from "vitest";

import {
  registerAccountStorage,
  resetAccountStorage,
  getRegisteredAccountStorage,
  runAccountStorageOp,
  persistAccountMapFor,
} from "./accountStorage";
import type { AccountStorage } from "../interfaces/AccountStorage";
import type { AccountMap } from "../store/slices/accountsSlice";

afterEach(() => {
  resetAccountStorage();
});

function makeMap(activeAccountId: string | null): AccountMap {
  return { activeAccountId, accounts: {}, signedOut: false };
}

/** A storage whose writes take a controllable amount of real time. */
function makeSlowStorage(order: string[], delayMs = 20): AccountStorage {
  return {
    getAccountMap: vi.fn(async () => null),
    setAccountMap: vi.fn(async (_projectId: string, map: AccountMap) => {
      order.push(`start:${map.activeAccountId}`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      order.push(`end:${map.activeAccountId}`);
    }),
    deleteAccountMap: vi.fn(async () => {}),
  };
}

function makeHandle(): AccountStorage {
  return {
    getAccountMap: vi.fn(),
    setAccountMap: vi.fn(),
    deleteAccountMap: vi.fn(),
  };
}

describe("accountStorage slot", () => {
  it("is last-mount-wins for the SAME project, and is never cleared by a later read", () => {
    const first = makeHandle();
    const second = makeHandle();

    // A remount, a development hot reload, or a second provider for the same
    // project: a fresh handle, the same id. All ordinary, all must keep working.
    registerAccountStorage(first, "project-1");
    registerAccountStorage(second, "project-1");

    // There is deliberately no deregistration: unmounting one of two mounted
    // providers must not strip the survivor's handle, because that would
    // silently turn an awaited persist into a no-op.
    expect(getRegisteredAccountStorage()).toEqual({
      storage: second,
      projectId: "project-1",
    });
  });

  it("THROWS when a second provider mounts for a DIFFERENT project", () => {
    // One project per app is the supported shape. Everything here is
    // process-global, so the second project takes the shared world over rather
    // than getting its own: the non-last project's switching stops working, and
    // its mint writes a rotated successor that the persist guard refuses AFTER
    // the exchange revoked the presented token — locking that account out for
    // good. Failing at mount is the whole fix.
    registerAccountStorage(makeHandle(), "project-1");

    expect(() => registerAccountStorage(makeHandle(), "project-2")).toThrow(
      /one project per app/i,
    );

    // ...and the first project keeps its handle, so nothing it later persists
    // can land under the second project's key.
    expect(getRegisteredAccountStorage()?.projectId).toBe("project-1");
  });
});

describe("persistAccountMapFor", () => {
  it("is a clean no-op when no storage is registered — neither hangs nor throws", async () => {
    // `@sublay/core` used directly with no platform package is a genuinely
    // storage-less configuration, not an error.
    await expect(persistAccountMapFor("project-1", makeMap("user-1"))).resolves.toBeUndefined();
  });

  it("writes through the registered handle under its registered projectId", async () => {
    const storage: AccountStorage = {
      getAccountMap: vi.fn(),
      setAccountMap: vi.fn(async () => {}),
      deleteAccountMap: vi.fn(),
    };
    registerAccountStorage(storage, "project-1");

    await persistAccountMapFor("project-1", makeMap("user-1"));

    expect(storage.setAccountMap).toHaveBeenCalledWith(
      "project-1",
      makeMap("user-1")
    );
  });

  it("REJECTS rather than writing when the projectId does not match the slot", async () => {
    // Last-mount-wins: with two providers mounted for two different projects
    // the slot holds whichever mounted last. Writing to it regardless would let
    // a mint land its rotated successor under the wrong key and report success,
    // leaving a server-revoked token live on disk.
    const storage: AccountStorage = {
      getAccountMap: vi.fn(),
      setAccountMap: vi.fn(async () => {}),
      deleteAccountMap: vi.fn(),
    };
    registerAccountStorage(storage, "project-2");

    await expect(
      persistAccountMapFor("project-1", makeMap("user-1"))
    ).rejects.toThrow(/registered for project project-2, not project-1/);
    expect(storage.setAccountMap).not.toHaveBeenCalled();
  });

  it("REJECTS when the underlying write fails", async () => {
    // The whole point of the write-contract change: an await that resolves on a
    // failed write lets a caller treat an already-revoked refresh token as
    // durably stored.
    const storage: AccountStorage = {
      getAccountMap: vi.fn(),
      setAccountMap: vi.fn(async () => {
        throw new Error("keychain unavailable");
      }),
      deleteAccountMap: vi.fn(),
    };
    registerAccountStorage(storage, "project-1");

    await expect(persistAccountMapFor("project-1", makeMap("user-1"))).rejects.toThrow(
      "keychain unavailable"
    );
  });
});

describe("runAccountStorageOp", () => {
  it("serializes overlapping persists — they cannot interleave, and the later map wins", async () => {
    const order: string[] = [];
    const storage = makeSlowStorage(order);
    registerAccountStorage(storage, "project-1");

    const first = persistAccountMapFor("project-1", makeMap("first"));
    const second = persistAccountMapFor("project-1", makeMap("second"));

    await Promise.all([first, second]);

    expect(order).toEqual([
      "start:first",
      "end:first",
      "start:second",
      "end:second",
    ]);
    // "Later map wins wholesale": the last write to reach storage is the later
    // map, whole, rather than a mix of the two.
    const calls = (storage.setAccountMap as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[calls.length - 1][1].activeAccountId).toBe("second");
  });

  it("keeps the queue alive when an operation rejects, and delivers the rejection only to its own caller", async () => {
    const order: string[] = [];
    registerAccountStorage(
      {
        getAccountMap: vi.fn(),
        setAccountMap: vi.fn(async (_p: string, map: AccountMap) => {
          if (map.activeAccountId === "boom") throw new Error("write failed");
          order.push(map.activeAccountId!);
        }),
        deleteAccountMap: vi.fn(),
      },
      "project-1"
    );

    const failing = persistAccountMapFor("project-1", makeMap("boom"));
    const following = persistAccountMapFor("project-1", makeMap("after"));

    await expect(failing).rejects.toThrow("write failed");
    await expect(following).resolves.toBeUndefined();
    expect(order).toEqual(["after"]);
  });

  it("does not serialize across different projects", async () => {
    const order: string[] = [];
    const op = (label: string) => async () => {
      order.push(`start:${label}`);
      await new Promise((resolve) => setTimeout(resolve, 20));
      order.push(`end:${label}`);
    };

    await Promise.all([
      runAccountStorageOp("project-a", op("a")),
      runAccountStorageOp("project-b", op("b")),
    ]);

    // Interleaved, not sequential — two projects have independent stores.
    expect(order).toEqual(["start:a", "start:b", "end:a", "end:b"]);
  });
});
