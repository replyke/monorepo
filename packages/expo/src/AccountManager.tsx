import * as SecureStore from "expo-secure-store";
import { useAccountSync, useProject, handleError } from "@sublay/core";
import type { AccountStorage, AccountMap, AccountEntry } from "@sublay/core";

// expo-secure-store rejects keys containing `:` on iOS — keys must match
// /^[A-Za-z0-9._-]+$/. Use `_` as the separator instead.
const STORAGE_KEY_PREFIX = "sublay-accounts_";

/**
 * SecureStore's documented per-value ceiling. Past it, iOS Keychain and
 * Android's encrypted store start failing writes — historically as a silent
 * `handleError` that ate the whole account map, since the map was one value.
 */
const MAX_VALUE_BYTES = 2048;

/**
 * Bumped whenever the on-disk layout changes. A value written by an older
 * release does not parse as this shape, and is deliberately read as
 * signed-out rather than migrated: see `getAccountMap`.
 */
const INDEX_VERSION = 2;

/**
 * The index value. It is the commit point for the whole map: `accountIds` is
 * the authoritative list, and any per-account key not named there is garbage
 * regardless of whether its value happens to be readable.
 */
interface StoredIndex {
  v: number;
  activeAccountId: string | null;
  signedOut: boolean;
  deviceIdentifier: AccountMap["deviceIdentifier"];
  /** Committed accounts, in order. */
  accountIds: string[];
  /**
   * Keys that may exist on disk but are NOT committed by `accountIds` — either
   * about to be written (add path) or about to be deleted (removal path).
   *
   * This list is what makes an interrupted write recoverable. There is no
   * key-enumeration API in SecureStore, so a `previous \ current` diff cannot
   * find an orphan: once the index no longer names an account, the diff is
   * empty and the account's refresh token is unreachable forever. Every key
   * that might exist without being committed is announced here first, and the
   * loader sweeps whatever it finds that `accountIds` does not claim.
   */
  pending: string[];
}

const indexKey = (projectId: string) => `${STORAGE_KEY_PREFIX}${projectId}`;
const accountKey = (projectId: string, userId: string) =>
  `${STORAGE_KEY_PREFIX}${projectId}_u_${userId}`;

/**
 * UTF-8 byte length without `TextEncoder`, which is not guaranteed on every
 * Hermes build. The budget is measured in bytes, not characters — a name in a
 * non-Latin script is 2–3 bytes per character.
 */
function utf8ByteLength(value: string): number {
  let bytes = 0;
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code < 0x80) bytes += 1;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff) {
      // Surrogate pair — one 4-byte code point, consumes the low surrogate.
      bytes += 4;
      i += 1;
    } else bytes += 3;
  }
  return bytes;
}

/**
 * Serializes one account entry, shedding optional fields rather than failing
 * the write if it does not fit.
 *
 * A realistic worst-case entry measures ~730 B, so this is a backstop, not an
 * expected path — but it is the exact failure that used to eat whole account
 * maps silently. Order matters: `avatar` (a URL, the only unbounded field) goes
 * first, then `email`. Never the refresh token, and never id/name/username —
 * shedding those would leave an entry that loads but cannot be used or shown.
 */
function serializeEntry(userId: string, entry: AccountEntry): string {
  let payload = entry;
  let serialized = JSON.stringify(payload);
  if (utf8ByteLength(serialized) <= MAX_VALUE_BYTES) return serialized;

  const dropped: string[] = [];

  if (payload.user.avatar != null) {
    payload = { ...payload, user: { ...payload.user, avatar: null } };
    dropped.push("avatar");
    serialized = JSON.stringify(payload);
  }

  if (utf8ByteLength(serialized) > MAX_VALUE_BYTES && payload.user.email != null) {
    payload = { ...payload, user: { ...payload.user, email: null } };
    dropped.push("email");
    serialized = JSON.stringify(payload);
  }

  if (dropped.length > 0) {
    handleError(
      new Error(
        `Account ${userId} exceeded the ${MAX_VALUE_BYTES}-byte SecureStore limit; dropped: ${dropped.join(
          ", "
        )}`
      ),
      "Account entry too large for SecureStore"
    );
  }

  if (utf8ByteLength(serialized) > MAX_VALUE_BYTES) {
    // Nothing left to shed — the refresh token and identity fields stay. The
    // write is still attempted: SecureStore may accept it, and refusing here
    // would drop the credential on the floor for certain.
    handleError(
      new Error(
        `Account ${userId} is still ${utf8ByteLength(
          serialized
        )} bytes after shedding optional fields`
      ),
      "Account entry too large for SecureStore"
    );
  }

  return serialized;
}

type IndexRead =
  | { kind: "index"; index: StoredIndex }
  | { kind: "legacy" }
  | { kind: "empty" }
  | { kind: "unreadable"; error: unknown };

/**
 * `unreadable` and `empty` are deliberately DIFFERENT kinds.
 *
 * The read path treats them the same — there is nothing to load either way.
 * The write path must not: conflating them makes a store that merely failed to
 * answer look like a store with nothing in it, which sends `setAccountMap` down
 * the first-write branch. That branch computes orphans against an empty
 * committed list, so every account already on disk is neither announced nor
 * swept, and its refresh token becomes unreachable — the one orphan the pending
 * list cannot reach, because it was never told about it.
 */
async function readIndex(projectId: string): Promise<IndexRead> {
  let raw: string | null;
  try {
    raw = await SecureStore.getItemAsync(indexKey(projectId));
  } catch (error) {
    return { kind: "unreadable", error };
  }
  if (!raw) return { kind: "empty" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { kind: "legacy" };
  }

  const candidate = parsed as Partial<StoredIndex> | null;
  if (
    !candidate ||
    typeof candidate !== "object" ||
    candidate.v !== INDEX_VERSION ||
    !Array.isArray(candidate.accountIds)
  ) {
    // Either a pre-chunking value (the whole map under this key) or something
    // we do not recognize. Both are legacy.
    return { kind: "legacy" };
  }

  return {
    kind: "index",
    index: {
      v: INDEX_VERSION,
      activeAccountId: candidate.activeAccountId ?? null,
      signedOut: candidate.signedOut ?? false,
      deviceIdentifier: candidate.deviceIdentifier ?? null,
      accountIds: candidate.accountIds.filter(
        (id): id is string => typeof id === "string"
      ),
      pending: Array.isArray(candidate.pending)
        ? candidate.pending.filter((id): id is string => typeof id === "string")
        : [],
    },
  };
}

async function writeIndex(
  projectId: string,
  index: StoredIndex
): Promise<void> {
  const serialized = JSON.stringify(index);
  if (utf8ByteLength(serialized) > MAX_VALUE_BYTES) {
    // Nothing to shed here — every field is load-bearing. Five ids plus a Web
    // Push subscription is ~750 B, so this is unreachable in practice; it is
    // logged rather than silently attempted so a future field that blows the
    // budget is visible.
    handleError(
      new Error(
        `Account index is ${utf8ByteLength(serialized)} bytes, over the ${MAX_VALUE_BYTES}-byte limit`
      ),
      "Account index too large for SecureStore"
    );
  }
  await SecureStore.setItemAsync(indexKey(projectId), serialized);
}

/** Deletes the ids in `pending` that `accountIds` does not claim. Best effort. */
async function sweep(projectId: string, index: StoredIndex): Promise<void> {
  const stale = index.pending.filter((id) => !index.accountIds.includes(id));
  if (stale.length === 0) return;

  const survived: string[] = [];
  for (const id of stale) {
    try {
      await SecureStore.deleteItemAsync(accountKey(projectId, id));
    } catch {
      // Leave it announced so the next load tries again. A key we cannot
      // delete must stay reachable, not be forgotten.
      survived.push(id);
    }
  }

  if (survived.length === stale.length) return;

  try {
    await writeIndex(projectId, { ...index, pending: survived });
  } catch {
    // The values are already gone; a stale `pending` entry is harmless and the
    // next sweep is idempotent. Never fail a load over this.
  }
}

export const secureStoreStorage: AccountStorage = {
  /**
   * Tolerant by contract. A missing value for a listed account, an unparseable
   * entry, an unreadable store — all degrade to "that account isn't there"
   * rather than taking the bootstrap down.
   */
  async getAccountMap(projectId: string): Promise<AccountMap | null> {
    const read = await readIndex(projectId);

    // Unchanged, tolerant behavior: nothing useful can be done with a read
    // failure at the call site, and throwing here would take the bootstrap down.
    if (read.kind === "empty" || read.kind === "unreadable") return null;

    if (read.kind === "legacy") {
      // A value written before chunking. Deliberately NOT migrated: the whole
      // point of chunking is that the old single-value layout could not hold
      // five accounts, and a shim would have to trust a blob that may itself be
      // a truncated write. Expo consumers are signed out once, by design.
      return { activeAccountId: null, accounts: {}, signedOut: true };
    }

    const { index } = read;
    await sweep(projectId, index);

    const accounts: Record<string, AccountEntry> = {};
    for (const id of index.accountIds) {
      let raw: string | null = null;
      try {
        raw = await SecureStore.getItemAsync(accountKey(projectId, id));
      } catch {
        raw = null;
      }
      if (!raw) continue;
      try {
        accounts[id] = JSON.parse(raw) as AccountEntry;
      } catch {
        // Unreadable entry — skip it rather than failing the load.
      }
    }

    // The stored pointer is returned verbatim even when its value went missing.
    // Resolving a dangling pointer is core's decision, not storage's:
    // `useAccountSync` Phase A already distinguishes "never chose" (fall back to
    // the first stored account) from "deliberately signed out" (stay out), and
    // second-guessing it here would collapse the two.
    return {
      activeAccountId: index.activeAccountId,
      accounts,
      signedOut: index.signedOut,
      deviceIdentifier: index.deviceIdentifier ?? null,
    };
  },

  /**
   * One value per account plus the index, in an order that leaves no
   * uncommitted key unreachable at any interruption point:
   *
   *   1. announce every key that will exist without being committed yet
   *   2. write the per-account values
   *   3. write the index  ← the commit point, both for adds and for removals
   *   4. delete the values the index just stopped naming
   *   5. clear the announcement
   *
   * Steps 1 and 5 are skipped when there is nothing to announce. The common
   * case — an ordinary refresh-token rotation, which neither adds nor removes
   * an account — skips both, costing one read, N value writes and one index
   * write. An add costs one extra index write (the announcement); a removal
   * costs two (the announcement, and the `pending` clear after the delete).
   *
   * Core serializes calls per project (`config/accountStorage`), so two
   * overlapping persists cannot interleave into a mixed map — the later one runs
   * whole and wins whole.
   */
  async setAccountMap(projectId: string, map: AccountMap): Promise<void> {
    try {
      const read = await readIndex(projectId);
      if (read.kind === "unreadable") {
        // Refuse rather than clobber. A caller that cannot read the existing
        // index cannot safely replace it: overwriting would strand every
        // per-account value the unread index was naming. Rejecting is the
        // honest answer now that the write contract rejects — the map stays in
        // memory and the next persist retries.
        throw read.error instanceof Error
          ? read.error
          : new Error("Could not read the account index");
      }
      const previous = read.kind === "index" ? read.index : null;
      const committed = previous?.accountIds ?? [];
      const announced = previous?.pending ?? [];

      const nextIds = Object.keys(map.accounts);
      const uncommitted = nextIds.filter((id) => !committed.includes(id));
      const orphans = Array.from(new Set([...committed, ...announced])).filter(
        (id) => !nextIds.includes(id)
      );

      const toAnnounce = Array.from(
        new Set([...announced, ...uncommitted, ...orphans])
      );

      const base: StoredIndex = {
        v: INDEX_VERSION,
        activeAccountId: map.activeAccountId,
        signedOut: map.signedOut ?? false,
        deviceIdentifier: map.deviceIdentifier ?? null,
        accountIds: nextIds,
        pending: orphans,
      };

      // 1. Announce. Keeps the OLD `accountIds`, so an interruption between
      //    here and step 3 leaves the previous map authoritative while making
      //    the half-written new keys reachable for the sweep.
      const announcementChanged =
        toAnnounce.length !== announced.length ||
        toAnnounce.some((id) => !announced.includes(id));
      if (previous && announcementChanged) {
        await writeIndex(projectId, {
          ...previous,
          accountIds: committed,
          pending: toAnnounce,
        });
      } else if (!previous && toAnnounce.length > 0) {
        // Nothing was committed before, so the announcement must describe an
        // EMPTY map — not the incoming one. Carrying `activeAccountId` forward
        // here would, on an interruption, leave an index whose active id names
        // an account it does not list: precisely the corrupt shape the rest of
        // this work exists to prevent.
        await writeIndex(projectId, {
          v: INDEX_VERSION,
          activeAccountId: null,
          signedOut: false,
          deviceIdentifier: null,
          accountIds: [],
          pending: toAnnounce,
        });
      }

      // 2. Per-account values.
      for (const id of nextIds) {
        await SecureStore.setItemAsync(
          accountKey(projectId, id),
          serializeEntry(id, map.accounts[id])
        );
      }

      // 3. Commit.
      await writeIndex(projectId, base);

      // 4/5. Reclaim what the commit dropped. Best effort from here on: the
      //      index is already correct, and anything left behind is named in
      //      `pending` for the next load's sweep.
      if (orphans.length > 0) {
        await sweep(projectId, base);
      }
    } catch (error) {
      // Log AND rethrow. The write contract rejects on failure now — an awaited
      // persist that resolves on a failed write is what would let a caller
      // treat an already-revoked refresh token as durably stored.
      handleError(error, "Failed to write account map to SecureStore");
      throw error;
    }
  },

  /**
   * A full wipe, including the device identifier. Values first, index last: an
   * interruption leaves the index still naming what survives, whereas deleting
   * the index first would strand every remaining credential unreachable.
   */
  async deleteAccountMap(projectId: string): Promise<void> {
    try {
      const read = await readIndex(projectId);
      if (read.kind === "unreadable") {
        // Same rule as the write path, for the same reason: deleting the index
        // we could not read would leave every per-account value resident and
        // unreachable — a credential wipe that wipes nothing.
        throw read.error instanceof Error
          ? read.error
          : new Error("Could not read the account index");
      }
      if (read.kind === "index") {
        const ids = Array.from(
          new Set([...read.index.accountIds, ...read.index.pending])
        );
        for (const id of ids) {
          await SecureStore.deleteItemAsync(accountKey(projectId, id));
        }
      }
      await SecureStore.deleteItemAsync(indexKey(projectId));
    } catch (error) {
      handleError(error, "Failed to delete account map from SecureStore");
      throw error;
    }
  },
};

function AccountManager() {
  const { projectId } = useProject();
  useAccountSync(secureStoreStorage, projectId!);
  return null;
}

export default AccountManager;
