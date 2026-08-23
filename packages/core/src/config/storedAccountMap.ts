/* ────────────────────────────────────────────────────────────────────────────
 * VALIDATION OF PERSISTED ACCOUNT DATA
 *
 * Everything an `AccountStorage` adapter reads back comes out of a store the
 * SDK does not own and cannot constrain — `localStorage`, the iOS/Android
 * Keychain, SecureStore. A `as AccountMap` or `as AccountEntry` on a
 * `JSON.parse` result is a CLAIM about those bytes, not a check of them: the
 * compiler is satisfied and every field is still whatever the store said.
 * These functions are where the claim is actually earned.
 *
 * They live in core rather than in one adapter because all three adapters read
 * the same data back, and a guard that exists in one of them is not a guard.
 * The failure they prevent is also cross-platform: a half-formed persisted web
 * identifier throws in `pushIdentifiersEqual`, which dereferences
 * `subscription.keys.p256dh` — far from the read that admitted it, on whichever
 * platform happens to load the value.
 *
 * WHAT IS SHARED AND WHAT IS NOT. Two on-disk layouts exist. `react-js` and
 * `react-native` serialize the WHOLE map as one value (`readStoredAccountMap`
 * below reads that shape end to end). `expo` cannot — SecureStore has a
 * per-value ceiling — so it keeps a hand-rolled index plus one value per
 * account. What the two layouts have in common is every field's MEANING, which
 * is what lives here: the entry rules, the identifier rules, and the four
 * device/selection fields that both layouts carry (`readStoredMapFields`).
 * Expo's index-only fields (`v`, `accountIds`, `pending`) are its own business
 * and stay in its adapter.
 * ──────────────────────────────────────────────────────────────────────────── */

import type { PushDeviceIdentifier } from "../interfaces/PushTokenAdapter";
import type { AccountEntry, AccountMap } from "../store/slices/accountsSlice";

/**
 * A non-null, non-array object — the only thing any of the shapes below can be.
 *
 * Arrays are excluded explicitly: `typeof [] === "object"`, so an array reaches
 * every field access below and answers `undefined` to all of them, which several
 * of these checks would otherwise read as "absent" rather than "not this shape".
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

/**
 * The rules a persisted account entry has to satisfy at EITHER layout, stated
 * once. Returns the entry with its identity settled, or `null` if it is not an
 * entry.
 *
 * WHAT MAKES AN ENTRY AN ENTRY. A refresh token and a user object: without the
 * token there is no session to preserve, and without the user there is nobody
 * to preserve it for. Both are required, and an entry missing either is
 * rejected rather than patched up — a half-entry that loads is worse than one
 * that never appears.
 *
 * IDENTITY MUST AGREE WITH THE KEY. An entry whose own `user.id` names someone
 * other than the account key it was filed under is REJECTED, not repaired.
 * Either half could be the truth and there is no way to tell which, so any
 * repair is a guess about whose credential this is — and guessing wrong files a
 * live session under the wrong account, which is the exact failure the
 * multi-account work exists to prevent. Dropping it costs one re-sign-in.
 *
 * An ABSENT id is not a conflict: every layout keys its accounts by `user.id`,
 * so the key is a sound identity for an entry that does not carry one. It is
 * filled in from the key, which is why every entry this returns is guaranteed
 * to agree with its key.
 *
 * `tokenExpiresAt` is normalized to a number, defaulting to `0` when the stored
 * value is not one. `0` reads as "expired", which renders a re-auth affordance
 * — the safe direction to be wrong in, since the alternative is claiming a
 * credential is live. Every other field is carried through untouched: this is a
 * gate on the fields the SDK itself depends on, not a whitelist of the account
 * shape, so a field added later survives a round trip without having to be
 * named here.
 */
export function readStoredAccountEntry(
  userId: string,
  value: unknown
): AccountEntry | null {
  if (!isRecord(value)) return null;
  const candidate = value;

  if (
    typeof candidate.refreshToken !== "string" ||
    candidate.refreshToken === ""
  )
    return null;

  const rawUser = candidate.user;
  if (!isRecord(rawUser)) return null;
  const user = rawUser;

  // Present-but-different is a conflict, whatever its type — a non-string id
  // cannot equal the string key, so it lands here too.
  if (user.id !== undefined && user.id !== userId) return null;

  // The display fields are normalized rather than passed through: they are the
  // ones that reach a render, and an object where a string belongs takes the
  // switcher down with "Objects are not valid as a React child". `null` is
  // already their absent value, so degrading to it costs nothing.
  const asStringOrNull = (v: unknown) => (typeof v === "string" ? v : null);

  return {
    ...candidate,
    refreshToken: candidate.refreshToken,
    tokenExpiresAt:
      typeof candidate.tokenExpiresAt === "number" ? candidate.tokenExpiresAt : 0,
    user: {
      ...user,
      id: userId,
      name: asStringOrNull(user.name),
      email: asStringOrNull(user.email),
      avatar: asStringOrNull(user.avatar),
    },
  } as unknown as AccountEntry;
}

/**
 * The stored device identifier, or `null` if it is not one.
 *
 * Two valid shapes, native and web, mirroring `PushDeviceIdentifier`. The web
 * one is nested, and a HALF-formed subscription is the case that matters: an
 * object carrying an `endpoint` but no `keys` satisfies a cast and then throws
 * the moment anything reads `subscription.keys.p256dh` — which
 * `pushIdentifiersEqual` does, unguarded, on the STORED identifier. Each shape
 * is therefore accepted whole or not at all.
 *
 * Empty strings are rejected alongside missing ones. Neither the OS nor the
 * browser hands out an empty token, endpoint or key, and an identifier that
 * routes nowhere is worse than none: `null` leaves the re-acquisition paths
 * (`usePushRegistration`'s mount read, the rotation subscription) free to fetch
 * a real one, while a present-but-useless value looks to every one of them like
 * an identifier already in hand.
 */
export function readStoredDeviceIdentifier(
  value: unknown
): PushDeviceIdentifier | null {
  if (!isRecord(value)) return null;
  const candidate = value;
  const platform = candidate.platform;

  if (platform === "ios" || platform === "android") {
    const token = candidate.token;
    if (typeof token !== "string" || token === "") return null;
    return { platform, token };
  }

  if (platform === "web") {
    const rawSubscription = candidate.subscription;
    if (!isRecord(rawSubscription)) return null;
    const subscription = rawSubscription;

    const endpoint = subscription.endpoint;
    if (typeof endpoint !== "string" || endpoint === "") return null;

    const rawKeys = subscription.keys;
    if (!isRecord(rawKeys)) return null;
    const keys = rawKeys;
    const p256dh = keys.p256dh;
    const auth = keys.auth;
    if (typeof p256dh !== "string" || p256dh === "") return null;
    if (typeof auth !== "string" || auth === "") return null;

    return {
      platform: "web",
      subscription: { endpoint, keys: { p256dh, auth } },
    };
  }

  return null;
}

/**
 * The four non-account fields every layout carries, each narrowed on its own.
 *
 * Concrete values, never absences: this is what a stored INDEX needs (Expo
 * writes all four unconditionally), and each default is the safe reading of a
 * field the bytes did not supply. `readStoredAccountMap` deliberately does NOT
 * use this — see the note there about preserving absence.
 */
export interface StoredMapFields {
  activeAccountId: string | null;
  signedOut: boolean;
  deviceIdentifier: PushDeviceIdentifier | null;
  pushIdentifierProbed: boolean;
}

export function readStoredMapFields(
  candidate: Record<string, unknown>
): StoredMapFields {
  return {
    // Anything that is not a string is not an account id, and `?? null` would
    // have let one through: a number, an object, an array — all non-nullish,
    // all violating `AccountMap`'s type, all flowing straight into the
    // selection logic that decides which session to restore. `null` is the safe
    // reading: "nothing selected", which core already knows how to resolve (see
    // `useAccountSync` Phase A).
    activeAccountId:
      typeof candidate.activeAccountId === "string"
        ? candidate.activeAccountId
        : null,
    // Only a literal `true` means signed out. `?? false` accepted any truthy
    // value, and this flag suppresses account restoration outright — a stored
    // `"false"` is a truthy string, and would have kept the user staring at a
    // signed-out app with their credentials sitting on disk.
    signedOut: candidate.signedOut === true,
    // Whole or nothing: a half-formed identifier throws later, where the
    // thrower is not the reader. See `readStoredDeviceIdentifier`.
    deviceIdentifier: readStoredDeviceIdentifier(candidate.deviceIdentifier),
    // Absent reads as `false` — a map written before this field existed is
    // precisely the population the one-shot read exists for. Anything that is
    // not literally `true` reads the same way: this is parsed from a store we
    // do not control, and a truthy non-boolean would read as already-probed and
    // skip the probe, which is the one outcome the flag exists to prevent.
    pushIdentifierProbed: candidate.pushIdentifierProbed === true,
  };
}

/**
 * A whole persisted `AccountMap`, or `null` when the value is not one.
 *
 * The read path for the adapters that serialize the entire map as ONE stored
 * value (`react-js`'s `localStorage` entry, `react-native`'s Keychain
 * password). Expo's chunked layout composes the pieces above instead.
 *
 * WHAT MAKES A MAP A MAP: an object carrying an `accounts` object. Nothing
 * else is required, because nothing else can be missing in a way that makes the
 * value unrecognizable — every other field has a safe reading. A root that
 * fails this returns `null`, which is what these adapters already answered for
 * bytes they could not parse: the tolerant-read contract, unchanged.
 *
 * ONE BAD ENTRY COSTS ITS OWN ACCOUNT, NEVER THE MAP. Entries are validated
 * individually and a rejected one is simply absent from the result, so a single
 * corrupt credential does not sign every other account out.
 *
 * ABSENT OPTIONAL FIELDS STAY ABSENT. `signedOut`, `deviceIdentifier` and
 * `pushIdentifierProbed` are optional on `AccountMap` and documented to read a
 * particular way when missing; a map written before one of them existed must
 * come back missing it, not carrying a value the writer never chose. Present
 * but invalid is different — that degrades to the same safe default
 * `readStoredMapFields` applies. (This is also why that helper is not used
 * here: an index has to have all four, a map does not.)
 */
export function readStoredAccountMap(value: unknown): AccountMap | null {
  if (!isRecord(value)) return null;
  const candidate = value;

  const rawAccounts = candidate.accounts;
  if (!isRecord(rawAccounts)) return null;

  const accounts: Record<string, AccountEntry> = {};
  for (const [userId, entryValue] of Object.entries(rawAccounts)) {
    const entry = readStoredAccountEntry(userId, entryValue);
    if (entry) accounts[userId] = entry;
  }

  const map: AccountMap = {
    activeAccountId:
      typeof candidate.activeAccountId === "string"
        ? candidate.activeAccountId
        : null,
    accounts,
  };

  if (candidate.signedOut !== undefined) {
    map.signedOut = candidate.signedOut === true;
  }
  if (candidate.deviceIdentifier !== undefined) {
    map.deviceIdentifier = readStoredDeviceIdentifier(
      candidate.deviceIdentifier
    );
  }
  if (candidate.pushIdentifierProbed !== undefined) {
    map.pushIdentifierProbed = candidate.pushIdentifierProbed === true;
  }

  return map;
}
