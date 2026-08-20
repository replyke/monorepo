// Serialized, awaitable access to the platform's `AccountStorage`.
//
// Two problems live here, and neither can be solved in a platform adapter.
//
// 1. SERIALIZATION. `useAccountSync` Phase C fires `setAccountMap` unawaited on
//    every `[accounts, activeAccountId, ...]` change, and a single account
//    removal reliably produces two overlapping chains (once on the removal,
//    once after the refresh rotates the next account's token). While a persist
//    was one atomic write that was merely last-write-wins over a whole map.
//    Once Expo chunks the map into one value per account plus an index, an
//    overlapping pair can interleave into a MIXED state — a pre-rotation
//    refresh token sitting behind a correct-looking index, i.e. a
//    server-revoked credential that 403s on next launch.
//
//    The mutex is here rather than in the Expo adapter because the races come
//    from core's own effects and from cross-platform reconciliation. An
//    Expo-only mutex would leave `react-js` and `react-native` unserialized.
//
// 2. REACHABILITY. `AccountStorage` is otherwise only ever the parameter of
//    `useAccountSync`. Callers that must not proceed until a write has landed —
//    notably anything that spends a rotating refresh token — cannot call a hook
//    and have no other route to the handle. So the hook registers the handle
//    *and its projectId* into the slot below; a handle alone would let a write
//    land under the wrong project's key.
//
// Follows `config/authGate`'s precedent in two respects: module-level state
// shared by however many providers are mounted (last mount wins), and NEVER
// cleared on unmount — clearing would silently turn the survivor's awaited
// persist into a no-op, which for the mint path means treating an already
// revoked token as durably stored.

import type { AccountStorage } from "../interfaces/AccountStorage";
import type { AccountMap } from "../store/slices/accountsSlice";

interface StorageSlot {
  storage: AccountStorage;
  projectId: string;
}

let slot: StorageSlot | null = null;

/**
 * One promise chain per projectId. Keyed by project rather than globally so two
 * providers for different projects do not queue behind each other, and so the
 * hook's own handle (which may differ from the slot's under a two-provider
 * mount) still serializes against slot-driven writes for the same project.
 */
const chains = new Map<string, Promise<void>>();

/**
 * Registers the storage handle an `AccountManager` mounted. Last mount wins;
 * there is no deregistration by design (see the header).
 */
export function registerAccountStorage(
  storage: AccountStorage,
  projectId: string
): void {
  slot = { storage, projectId };
}

/** Test seam — the module state above is shared across a whole run. */
export function resetAccountStorage(): void {
  slot = null;
  chains.clear();
}

/** What is registered right now, or `null` when no platform package mounted. */
export function getRegisteredAccountStorage(): StorageSlot | null {
  return slot;
}

/**
 * Runs `op` with exclusive access to `projectId`'s storage.
 *
 * The queue survives failures: a rejected op still lets the next one run, and
 * the rejection is delivered to *its own* caller only.
 */
export function runAccountStorageOp<T>(
  projectId: string,
  op: () => Promise<T>
): Promise<T> {
  const previous = chains.get(projectId) ?? Promise.resolve();
  // `.then(op, op)` rather than `.then(op)`: a preceding failure must not
  // cancel everything queued behind it.
  const run = previous.then(op, op);
  chains.set(
    projectId,
    run.then(
      () => undefined,
      () => undefined
    )
  );
  return run;
}

/**
 * Raised when a caller's project and the registered slot's project disagree.
 * A distinct type so the callers that must not proceed on a bad write can tell
 * "wrong project" apart from "the adapter failed".
 */
export class AccountStorageProjectMismatchError extends Error {
  constructor(expected: string, registered: string) {
    super(
      `Account storage is registered for project ${registered}, not ${expected}. Refusing to write.`
    );
    this.name = "AccountStorageProjectMismatchError";
  }
}

/**
 * Persists a map through the mutex, using the registered handle — for callers
 * that must not proceed until the write has actually landed.
 *
 * Rejects when the underlying write fails, which is only meaningful because the
 * `AccountStorage` write contract now rejects too. Every adapter used to catch,
 * log and resolve `void`, so awaiting one succeeded on a failed write and any
 * guarantee built on the await was fictional.
 *
 * With nothing registered — `@sublay/core` used directly with no platform
 * package, a genuinely storage-less configuration — this resolves immediately.
 * A clean no-op, never a hang and never a throw.
 *
 * **The `projectId` argument is a guard, not a convenience.** The slot is
 * last-mount-wins across the whole process (see the header), so with two
 * providers mounted for two different projects it holds whichever mounted last.
 * Writing to the slot's project unconditionally would be harmless for
 * `useAccountSync` — which passes its own handle and catches anyway — but not
 * for the mint path: a mint that landed its rotated successor under another
 * project's key would report success while leaving a server-revoked token live
 * on disk, destroying that account's token family on the next attempt. That is
 * the single unrecoverable outcome in this surface, so a mismatch rejects
 * loudly. A storage-LESS configuration is supported; a MISMATCHED one is a bug.
 *
 * (An unguarded `persistAccountMap(map)` existed briefly alongside this and was
 * removed: it ended up with no production caller, and the only thing separating
 * it from this function was the missing guard.)
 */
export function persistAccountMapFor(
  projectId: string,
  map: AccountMap
): Promise<void> {
  const current = slot;
  if (!current) return Promise.resolve();
  if (current.projectId !== projectId) {
    return Promise.reject(
      new AccountStorageProjectMismatchError(projectId, current.projectId)
    );
  }
  return runAccountStorageOp(projectId, () =>
    current.storage.setAccountMap(projectId, map)
  );
}
