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
 * Persists a map through the mutex, using the registered handle.
 *
 * Rejects when the underlying write fails — which is only meaningful because
 * the `AccountStorage` write contract now rejects too. Every adapter used to
 * catch, log and resolve `void`, so awaiting one succeeded on a failed write
 * and any guarantee built on the await was fictional.
 *
 * With nothing registered — `@sublay/core` used directly with no platform
 * package, a genuinely storage-less configuration — this resolves immediately.
 * A clean no-op, never a hang and never a throw.
 */
export function persistAccountMap(map: AccountMap): Promise<void> {
  const current = slot;
  if (!current) return Promise.resolve();
  return runAccountStorageOp(current.projectId, () =>
    current.storage.setAccountMap(current.projectId, map)
  );
}
