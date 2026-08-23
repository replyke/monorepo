import * as SecureStore from "expo-secure-store";
import {
  useAccountSync,
  useProject,
  handleError,
  readStoredAccountEntry,
  readStoredMapFields,
} from "@sublay/core";
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
 * release does not parse as this shape; a recognizable v1 map is converted
 * forward on load (see `migrateFromV1`), anything else reads as signed-out.
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
  /**
   * See `AccountMap.pushIdentifierProbed`. Device state, like
   * `deviceIdentifier` — and, like it, it MUST have a slot here: this index is
   * the only thing this adapter persists, so a field the interface does not
   * name is a field the Expo package silently drops on every write. It was
   * missing once, which left the one-time permission-ignoring push read
   * re-arming on every launch of an Expo app.
   */
  pushIdentifierProbed: boolean;
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

/* ────────────────────────────────────────────────────────────────────────────
 * VALIDATION OF PERSISTED VALUES
 *
 * Everything read back below comes out of SecureStore as JSON — a store this
 * adapter does not own and cannot constrain. A `as StoredIndex` or
 * `as AccountEntry` on a `JSON.parse` result is a claim about that data, not a
 * check of it: the compiler is satisfied and every field is still whatever the
 * bytes said.
 *
 * The rules themselves live in `@sublay/core`'s `config/storedAccountMap`,
 * because `react-js` and `react-native` read the same fields back out of their
 * own stores and a guard that exists in one adapter is not a guard. What is
 * imported here is the part that is layout-independent — `readStoredAccountEntry`
 * (what makes an entry an entry, and the key ↔ `user.id` identity rule) and
 * `readStoredMapFields` (the four device/selection fields every layout carries,
 * each narrowed to its own type). The index fields that are this layout's alone
 * — `v`, `accountIds`, `pending` — are narrowed in `readIndex` below.
 *
 * These imports are used by the v2 read path, NOT only by the v1 shim below:
 * deleting the shim must not take them with it.
 * ──────────────────────────────────────────────────────────────────────────── */

/* ────────────────────────────────────────────────────────────────────────────
 * v1 → v2 STORAGE SHIM
 *
 * WHAT THIS IS. A one-way, one-shot conversion of the account data written by
 * `@sublay/expo` releases up to and including 7.11.1 ("v1") into the layout
 * this file otherwise uses ("v2"). v1 stored the entire account map as a single
 * SecureStore value, under the very key the v2 index now occupies. v2 stores one
 * value per account plus a versioned index. There is no v1 writer anywhere; data
 * only ever moves v1 → v2, and only on load.
 *
 * DELETION INVENTORY — the complete list of what to remove, in file order:
 *
 *   1. this comment block, `readV1Entry`, `readV1Map` and `migrateFromV1`
 *      (everything between this line and `type IndexRead`)
 *   2. the `{ kind: "v1"; map: AccountMap }` member of `IndexRead`
 *   3. the `readV1Map(parsed)` dispatch in `readIndex` — the unrecognized-shape
 *      branch collapses back to a bare `return { kind: "unrecognized" }`
 *   4. the `read.kind === "v1"` branch in `getAccountMap` (the `unrecognized`
 *      branch below it stays: it is the signed-out fallback, not part of this)
 *   5. the `read.kind === "v1"` half of the `announced` expression in
 *      `setAccountMap`, which reverts to `previous?.pending ?? []`
 *   6. the `else if (read.kind === "v1")` branch in `deleteAccountMap`
 *   7. the sentence in `INDEX_VERSION`'s doc comment that points at
 *      `migrateFromV1` — prose, so nothing will flag it
 *
 * Items 2-6 are all compiler-caught once item 1 is gone, so a missed one costs a
 * red squiggle rather than a bug; item 7 is not, which is why it is listed. The
 * list is exhaustive — you should not need to go looking. On the test side it is
 * the whole `v1 → v2 migration` describe block; the `reads a shape that is
 * neither layout as signed-out` case belongs to the loader and stays.
 *
 * WHY IT EXISTS. The multi-account hardening release deliberately shipped
 * WITHOUT a migration: v1 data was read as signed-out, and Expo apps would sign
 * their user out once on upgrade. That call rested on a finding that the release
 * had no external exposure. The finding was real, but it was established by
 * counting rows for the push feature — it was never established for this storage
 * layer, and it cannot be: the SDK sends no header identifying itself, so the
 * server cannot tell which package made a request. With no way to measure who is
 * out there, "nobody is affected" was an assumption, not a fact, so the decision
 * was reversed before release.
 *
 * The blast radius is also wider than "multi-account apps". `useAccountSync`
 * calls `upsertAccount` unconditionally, so an app with exactly one signed-in
 * user stores that user in the same map. Without this shim, EVERY `@sublay/expo`
 * app signs its user out on upgrade, whether or not it ever showed a switcher.
 *
 * WHEN IT IS SAFE TO DELETE. When every installation still holding v1 data has
 * either already launched a version containing this shim (which converts it on
 * the spot and never looks at v1 again), or is one you are content to sign out.
 * There is no flag to check and no telemetry that will answer this — it is a
 * judgement about how long your consumers take to adopt a release and how much
 * app-store install inertia you are willing to write off. Two or three minor
 * versions of carriage is the usual shape of that judgement.
 *
 * Deleting it costs already-migrated installs NOTHING: their store has been in
 * v2 form since their first launch on a shim-carrying version, and their loads
 * never enter this code. The cost falls only on an install that skipped every
 * version that carried the shim and upgrades straight from 7.11.1-or-earlier to
 * the version that dropped it.
 *
 * ONE CONSTRAINT IF YOU EDIT IT. The conversion writes during a READ.
 * `useAccountSync` calls `getAccountMap` inside core's per-project storage
 * mutex (`@sublay/core`'s `config/accountStorage`), so anything here that
 * reached back for that mutex — `runAccountStorageOp`, or `persistAccountMapFor`
 * which takes it — would queue behind the read that is still running and hang
 * the bootstrap forever. Write through `expo-secure-store` directly, as the
 * functions below do. The mutex still does its job around this: the whole
 * conversion happens inside the read's turn, so no other persist can interleave
 * with it.
 *
 * WHAT BREAKS IF YOU DELETE IT TOO EARLY. Those users are signed out once and
 * must sign in again. Their stored refresh tokens become unreadable and are
 * eventually overwritten; nothing server-side is touched, so their accounts,
 * content and sessions elsewhere are unaffected. This is a courtesy migration —
 * annoying to lose, not dangerous. Do not let it hold a release hostage.
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Converts one v1 account entry, or returns `null` if it is not one.
 *
 * The v1 shape, as written by 7.11.1 and every release before it:
 *
 *     { refreshToken: string,
 *       tokenExpiresAt: number,          // epoch ms, present since the original
 *                                        // multi-account release — it predates
 *                                        // the chunking work
 *       user: { id, name, email, avatar } }
 *
 * Whether it is an entry at all — and whether it agrees with the key it was
 * filed under — is `readStoredAccountEntry`'s question, and both layouts ask it the
 * same way. What is left here is the part that is genuinely v1's: projecting
 * the four fields v1 recorded and leaving every later one absent.
 *
 * Fields v1 did not have are LEFT ABSENT rather than defaulted to a value, so
 * they land on exactly the meaning a missing field has everywhere else in this
 * surface: `username` absent = unknown (not "has no username"), `pushEnabled`
 * absent = never expressed a preference, `needsReauth` absent = no opinion.
 * Writing `false`/`null` for any of them would assert something v1 never
 * recorded — and for `pushEnabled` in particular, a migrated account that
 * genuinely never chose must not be treated as having consented to a push
 * binding. It reads as enabled where the SDK REPORTS state and as not-opted-in
 * where the SDK decides whether to BIND; a deliberate `register()` is what
 * turns the absent case into a recorded choice.
 */
function readV1Entry(userId: string, value: unknown): AccountEntry | null {
  const entry = readStoredAccountEntry(userId, value);
  if (!entry) return null;

  const user = entry.user;
  return {
    refreshToken: entry.refreshToken,
    // Every v1 writer emitted `tokenExpiresAt`, so `readStoredAccountEntry`'s `0`
    // default is defensive only.
    tokenExpiresAt: entry.tokenExpiresAt,
    user: {
      // Already reconciled with the key by `readStoredAccountEntry` — v1 keyed the map
      // by `user.id`, so the key is a sound identity for an entry that lost it.
      id: user.id,
      name: typeof user.name === "string" ? user.name : null,
      email: typeof user.email === "string" ? user.email : null,
      avatar: typeof user.avatar === "string" ? user.avatar : null,
    },
  };
}

/**
 * Recognizes a v1 map and converts it, or returns `null` for anything else.
 *
 * This is the line between "old data" and "garbage", and it has to hold from
 * both sides. Too strict and a real session is thrown away for a field nobody
 * cares about; too loose and arbitrary bytes are promoted into an account map,
 * writing per-account keys for ids that never existed. The recognizable core of
 * v1 is: an object carrying an `accounts` object, an `activeAccountId` that is a
 * string or null, and — when it claims accounts at all — at least one entry that
 * actually parses as an entry.
 *
 * The active pointer is carried across VERBATIM, including when it names an
 * entry that was dropped. Resolving a dangling pointer is core's decision, not
 * storage's, exactly as on the v2 read path.
 */
function readV1Map(parsed: unknown): AccountMap | null {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const candidate = parsed as {
    activeAccountId?: unknown;
    accounts?: unknown;
    signedOut?: unknown;
  };

  const rawAccounts = candidate.accounts;
  if (
    !rawAccounts ||
    typeof rawAccounts !== "object" ||
    Array.isArray(rawAccounts)
  )
    return null;

  if (
    candidate.activeAccountId !== undefined &&
    candidate.activeAccountId !== null &&
    typeof candidate.activeAccountId !== "string"
  )
    return null;

  const source = Object.entries(rawAccounts as Record<string, unknown>);
  const accounts: Record<string, AccountEntry> = {};
  for (const [userId, value] of source) {
    const entry = readV1Entry(userId, value);
    if (entry) accounts[userId] = entry;
  }

  // Claimed accounts but not one of them parses: this is not a v1 map that lost
  // an entry, it is something else that happens to have an `accounts` key.
  if (source.length > 0 && Object.keys(accounts).length === 0) return null;

  return {
    activeAccountId:
      typeof candidate.activeAccountId === "string"
        ? candidate.activeAccountId
        : null,
    accounts,
    // `signedOut` arrived during this same work, so no released v1 build ever
    // wrote it — only pre-chunking builds of the branch did. Carried anyway
    // because it costs one comparison, and absent reads as `false`, the same
    // default the v2 index applies.
    signedOut: candidate.signedOut === true,
    // v1 had no device identifier — because v1's `register()` never persisted
    // the one it registered with, not because v1 predates push. There is simply
    // nothing in a v1 map to carry forward. `null` (not absent) so this load
    // and every later one are identical.
    //
    // ⚠ DO NOT READ THIS AS "a v1 map means push was never set up." The v1
    // FORMAT outlived the arrival of push: push registration shipped in 7.5.0
    // and the v1 format stayed in use all the way through 7.11.1, so there is a
    // seven-minor-version window in which an install both stored a v1 map and
    // registered live `PushDevices` rows. Such an install arrives here with
    // server-side bindings and no local identifier, which is exactly the state
    // in which sign-out, account removal and the per-account toggle all no-op.
    //
    // It is handled in core rather than here: it re-acquires an identifier from
    // the adapter's rotation subscription or from `unregister()` — see
    // `usePushRegistration`, which is why neither of those is gated on already
    // having one.
    deviceIdentifier: null,
    // `false` for the same two reasons: v1 recorded nothing to carry forward,
    // and a concrete value (not an absence) keeps this load and every later v2
    // load byte-identical. `false` is also the only correct value — an
    // upgrading install is exactly the population the one-time
    // permission-ignoring read exists for, so it must arrive here still armed.
    pushIdentifierProbed: false,
  };
}

/**
 * Writes a converted v1 map out in v2 form. One shot: once the index lands, the
 * v1 value is gone and no later load takes this path again.
 *
 * ORDER IS THE WHOLE DESIGN, because the v1 blob sits at the index key and the
 * write that commits the conversion is the same write that destroys it.
 *
 *   1. per-account values — the v1 blob is still intact and still authoritative
 *   2. the index — commit; the v1 blob is replaced in the same operation
 *
 * Interrupted between the two, the store still holds a complete v1 map, so the
 * next load simply converts it again from the top. The conversion is idempotent:
 * it rewrites the same keys with the same content. Nothing is stranded, because
 * every value it wrote belongs to an id the surviving v1 blob still names — see
 * the `v1` branch of `setAccountMap`, which is what keeps that true even if the
 * app goes on to persist a different map before the retry.
 *
 * `pending` is empty on the committed index and correctly so: unlike the
 * ordinary write path there is no previous committed set to reclaim from, and
 * every value written above is named by this same index.
 *
 * SIZE. Fitting is guaranteed by construction, not hoped for: a v1 map was a
 * SINGLE SecureStore value, so a stored one is necessarily under the 2048-byte
 * ceiling, and every per-account value carved out of it is smaller than the blob
 * that contained it. `serializeEntry`/`writeIndex` still apply the shed and the
 * over-budget log, so a v1 value that somehow got past the limit on a lenient
 * platform is handled by the same path as any other oversize entry.
 */
async function migrateFromV1(projectId: string, map: AccountMap): Promise<void> {
  const ids = Object.keys(map.accounts);

  for (const id of ids) {
    await SecureStore.setItemAsync(
      accountKey(projectId, id),
      serializeEntry(id, map.accounts[id])
    );
  }

  await writeIndex(projectId, {
    v: INDEX_VERSION,
    activeAccountId: map.activeAccountId,
    signedOut: map.signedOut ?? false,
    deviceIdentifier: null,
    // `false`, and deliberately so. A v1 map is by definition an UPGRADING
    // install — exactly the population the one-time permission-ignoring read
    // exists to rescue, since a v1 map can coexist with live `PushDevices` rows
    // (see `readV1Map`). Writing `true` here would spend the one-shot on the
    // very devices it was written for, before it ever ran.
    pushIdentifierProbed: false,
    accountIds: ids,
    pending: [],
  });
}

type IndexRead =
  | { kind: "index"; index: StoredIndex }
  /** A recognizable pre-chunking map, already converted to the current shape. */
  | { kind: "v1"; map: AccountMap }
  /** Parsed or not, it is neither layout. Never migrated — see `getAccountMap`. */
  | { kind: "unrecognized" }
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
    // Not even JSON. Never a v1 map, so there is nothing to migrate.
    return { kind: "unrecognized" };
  }

  // `Record<string, unknown>`, not `Partial<StoredIndex>`: the value came out of
  // a store this adapter does not control, so every field below is narrowed on
  // its own rather than inheriting a type the bytes never promised.
  const candidate = parsed as Record<string, unknown> | null;
  if (
    !candidate ||
    typeof candidate !== "object" ||
    Array.isArray(candidate) ||
    candidate.v !== INDEX_VERSION ||
    !Array.isArray(candidate.accountIds)
  ) {
    // Either a pre-chunking value (the whole map under this key) or something
    // we do not recognize. Only the first is migrated.
    const v1 = readV1Map(parsed);
    return v1 ? { kind: "v1", map: v1 } : { kind: "unrecognized" };
  }

  return {
    kind: "index",
    index: {
      v: INDEX_VERSION,
      // `activeAccountId`, `signedOut`, `deviceIdentifier` and
      // `pushIdentifierProbed` mean the same thing in every layout, so their
      // narrowing lives in core — including WHY each default is the safe
      // reading of a field the bytes did not supply. See `readStoredMapFields`.
      ...readStoredMapFields(candidate),
      // The rest is this layout's alone: there is no `accountIds` or `pending`
      // in a whole-map store, so nothing to share.
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

    if (read.kind === "v1") {
      // A value written before chunking, already converted in `readIndex`.
      // Convert the STORE too, here and now, so the next load is an ordinary v2
      // read and this path is never taken again. See the v1 → v2 shim block.
      try {
        await migrateFromV1(projectId, read.map);
      } catch (error) {
        // Best effort by design. The v1 value is still on disk and still whole
        // — the conversion writes values before it touches the index — so the
        // next load retries from the top. Returning the converted map anyway
        // keeps the user signed in for THIS launch, which is the entire point;
        // failing the load here would sign them out over a transient locked
        // keychain, i.e. exactly the outcome the shim exists to prevent.
        handleError(
          error,
          "Failed to migrate stored accounts to the current layout"
        );
      }
      return read.map;
    }

    if (read.kind === "unrecognized") {
      // Neither layout: unparseable bytes, a truncated write, or a value that
      // is not an account map at all. NOT migrated — a shim that guessed here
      // would promote garbage into per-account keys — so it degrades to
      // signed-out, which is what this whole path used to do for v1 too.
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
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        // Unreadable entry — skip it rather than failing the load.
        continue;
      }
      // A cast here would have accepted whatever the bytes said, including an
      // entry naming a DIFFERENT user than the key it was stored under — a
      // session filed under the wrong account id, which is precisely what this
      // layout exists to prevent. Rejected, not repaired, and rejected alone:
      // one bad value costs its own account, never the map. See
      // `readStoredAccountEntry`.
      const entry = readStoredAccountEntry(id, parsed);
      if (entry) accounts[id] = entry;
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
      pushIdentifierProbed: index.pushIdentifierProbed ?? false,
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
      // A v1 blob names ids whose per-account values may ALREADY be on disk: a
      // conversion that wrote its values and was interrupted before its commit
      // leaves exactly that state. Those keys are uncommitted-but-possibly-
      // resident, which is precisely what `pending` means, so they enter the
      // computation as if the previous writer had announced them. Without this,
      // a write that lands while a conversion is half-finished commits an index
      // that neither names nor announces them, and their refresh tokens become
      // unreachable — the one orphan class the pending list cannot otherwise
      // reach. (This write replaces the v1 value, so an interruption from here
      // on signs the user out once — the pre-shim behavior, on a crash only.)
      const announced =
        previous?.pending ??
        (read.kind === "v1" ? Object.keys(read.map.accounts) : []);

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
        pushIdentifierProbed: map.pushIdentifierProbed ?? false,
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
          // `false`, for the same reason as `deviceIdentifier` above: this
          // index describes the EMPTY map that was committed before, not the
          // incoming one. An interruption here must leave the one-shot armed —
          // claiming it was already spent would be asserting something no read
          // ever established. The commit at step 3 carries the real value.
          pushIdentifierProbed: false,
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
      } else if (read.kind === "v1") {
        // Same reason as the write path: an interrupted conversion may have
        // written per-account values that the surviving v1 blob is the only
        // record of. Deleting just the blob would leave those credentials
        // resident and unreachable — a wipe that wipes nothing.
        for (const id of Object.keys(read.map.accounts)) {
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
