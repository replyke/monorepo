import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { SublayState } from "../sublayReducers";
import type { PushDeviceIdentifier } from "../../interfaces/PushTokenAdapter";

// Types

export interface AccountSummary {
  id: string;
  name: string | null;
  /**
   * Optional because entries persisted before this field existed simply do not
   * carry it. Absent means *unknown*, not "the user has no username" — the two
   * are different and only the second is `null`.
   */
  username?: string | null;
  email: string | null;
  avatar: string | null;
}

export interface AccountEntry {
  refreshToken: string;
  tokenExpiresAt: number; // epoch ms — extracted from JWT exp claim
  user: AccountSummary;
  /**
   * Whether this account wants push notifications on THIS device.
   *
   * Client-owned and durable: it records an explicit user choice, so it must
   * survive the entry being rebuilt — which happens on every launch and every
   * transition, because the server rotates the refresh token on each exchange
   * and `useAccountSync` Phase B writes a fresh entry whenever it changes.
   * That is why `upsertAccount` merges rather than replaces.
   *
   * **Three states, not two.** `true` and `false` are explicit user choices;
   * ABSENT means "never expressed a preference", which every entry written
   * before this field existed carries.
   *
   * Which way absent reads depends on the question being asked, and the two
   * questions have separate predicates on purpose:
   *
   *   - *"What does this account's push state look like?"* —
   *     `isAccountPushEnabled`. Absent reads as ENABLED. It is the value a
   *     per-account toggle renders as `checked`, and reading an upgrading
   *     install's accounts as off would flip every one of those switches.
   *   - *"May we create a push binding for this account?"* —
   *     `accountOptedIntoPush`. Absent reads as NO, because a binding routes
   *     message content to a device and nobody asked for it. This is the one
   *     that decides whether anything is bound, and it is deliberately NOT
   *     exported from the package.
   *
   * Never test the field directly; the absent case is what gets it wrong.
   */
  pushEnabled?: boolean;
  /**
   * Set when a transition INTO this account failed because the stored refresh
   * token was rejected — expired, revoked, reuse-detected, killed by a password
   * change, a remote sign-out-all or an admin revocation.
   *
   * The reactive half of the pair with `tokenExpiresAt`, and neither is
   * sufficient alone. `tokenExpiresAt` is proactive but only knows what the
   * JWT's own `exp` claim says; every death in the list above kills the token
   * family while `exp` is still comfortably in the future, and the only way to
   * learn about those is to have tried. This field records that we tried.
   *
   * **Absent means "no opinion", not "healthy".** `upsertAccount` merges, and
   * `useAccountSync` Phase B rebuilds a fresh entry literal on every launch and
   * every transition — an entry that says nothing about re-auth. If absent
   * overwrote, the marker would be erased on a cadence. It is cleared
   * deliberately instead, by `setActiveAccount`, which is dispatched on exactly
   * one occasion: a successful activation of that account.
   *
   * Read it through `accountNeedsReauth`, never as a bare truthiness test on a
   * possibly-absent field.
   */
  needsReauth?: boolean;
  /**
   * Set when this device's push identifier changed while the account was not
   * the active one, so its server-side binding now points at a token this
   * device no longer holds.
   *
   * **Why a marker and not a re-bind.** Binding a non-active account means
   * exchanging its stored refresh token for a session, and that exchange is
   * one-time-use: the server revokes the presented token as it answers. An
   * interruption between the two — the app swiped away, an OS suspension, a
   * dropped connection — leaves the stored copy dead and the successor
   * unsaved, and that account is then locked out for good. Running that trade
   * for up to five background accounts at launch is a lot of exposure to buy
   * notification routing with, so the rotation records what needs repairing
   * and the repair happens on the account's next activation, where a live
   * session already exists and nothing has to be exchanged.
   *
   * **Not `needsReauth`, and the two must not be conflated.** `needsReauth`
   * means this account's credential is dead and the user has to sign in again.
   * This means the credential is fine and only the notification routing is
   * stale — the account works, it is just quiet until it is next opened.
   *
   * Absent means "nothing to repair". Read it through `accountNeedsPushRebind`.
   */
  needsPushRebind?: boolean;
}

/**
 * `true` unless the account was explicitly silenced on this device.
 *
 * **Reported state, not a binding decision.** This is what a per-account push
 * switch renders as its `checked` value, and it answers the absent case with
 * `true` so an account that predates the preference does not display as off.
 * Deciding whether to actually CREATE a binding is a different and stricter
 * question — see `accountOptedIntoPush`.
 *
 * Read the flag through this, never as `entry.pushEnabled` — absent and `true`
 * report the same thing and a bare truthiness test gets the absent case wrong.
 */
export function isAccountPushEnabled(entry: AccountEntry): boolean {
  return entry.pushEnabled !== false;
}

/**
 * `true` only when this account has EXPLICITLY asked for push on this device.
 *
 * Internal, and deliberately not exported from the package: it is the rule for
 * *acting*, and publishing it alongside `isAccountPushEnabled` would invite
 * call sites to pick whichever one they read first.
 *
 * The difference is the absent case, and it is the whole point. An absent
 * preference is not consent. Treating it as consent is what let a plain
 * sign-in bind a brand-new account to a device whose identifier happened to
 * survive the previous user's sign-out — nobody granted anything, the app
 * never called `register()`, and the binding survived a restart. It is also
 * what would mark an upgrading install's accounts as needing a re-bind that
 * the activation path, which applies this same rule, would then never clear.
 *
 * **Both sides use this one.** Marking and binding have to agree, or a mark is
 * either raised for something that will never be repaired or dropped for
 * something that needed repairing.
 */
export function accountOptedIntoPush(entry: AccountEntry): boolean {
  return entry.pushEnabled === true;
}

/**
 * `true` when this device's push identifier moved on while the account was in
 * the background, so its binding needs re-creating on next activation.
 *
 * Distinct from `accountNeedsReauth`: that one says the credential is dead and
 * the user must sign in again; this one says the credential is fine and only
 * the notifications are paused. An app that surfaces both should say different
 * things about them.
 */
export function accountNeedsPushRebind(entry: AccountEntry): boolean {
  return entry.needsPushRebind === true;
}

/**
 * `true` only when a transition into this account has actually been refused.
 *
 * Absent means nothing has gone wrong *that we know of* — it is not a promise
 * that the credential is live. Pair it with `tokenExpiresAt` when rendering a
 * switcher: expiry catches the deaths that are predictable, this catches the
 * ones that are not.
 */
export function accountNeedsReauth(entry: AccountEntry): boolean {
  return entry.needsReauth === true;
}

export interface AccountMap {
  activeAccountId: string | null;
  accounts: Record<string, AccountEntry>;
  /**
   * This device's push identifier — a device-level sibling of `accounts`, not a
   * per-account field. One copy serves every stored account.
   *
   * Persisted rather than cached in memory because the docs tell apps to call
   * `register()` on a deliberate user action and explicitly *not* on mount, so
   * an in-memory copy would be cold on nearly every launch while the server-side
   * binding lives on. With a cold copy, account removal cannot unbind its push
   * and the per-account toggle silently no-ops.
   *
   * It survives `clearAllAccounts` and sign-out-all — a device's push token does
   * not stop being that device's token because nobody is signed in — and is
   * cleared only by `deleteAccountMap`, which is a full wipe.
   */
  deviceIdentifier?: PushDeviceIdentifier | null;
  /**
   * `true` means this device has already run the ONE-TIME unconditional read of
   * its push identifier, so the read must never run again.
   *
   * **What it is for.** `usePushRegistration`'s mount read is gated on the OS
   * notification permission, which is a good steady-state rule and a wrong
   * rule exactly once: an install that registered on a release that persisted
   * no identifier, and has since revoked permission in system settings, holds a
   * live server-side binding that the gate makes unreachable — sign-out,
   * account removal and the per-account toggle are all gated on having an
   * identifier, so none of them can unbind it, and nothing else ever will
   * (revoking permission does not invalidate an APNs/FCM token, and the
   * server prunes only on uninstall/dead-token signals). So the read runs ONCE
   * ignoring permission, and this flag is what makes "once" survive a relaunch.
   *
   * Written by two places, both meaning "there is nothing left to discover":
   *
   *   - `usePushRegistration`, after the mount read has actually completed.
   *   - `useAccountSync` Phase A, when storage holds NO map at all. A device
   *     with no account map has never stored an account, so it cannot hold a
   *     binding created by an older release — and marking it here is what stops
   *     the one-shot firing on a fresh install whose app only mounts the push
   *     hook after sign-in.
   *
   * Device state like `deviceIdentifier`, not account state: it survives
   * `clearAllAccounts` and is dropped only by `deleteAccountMap`.
   *
   * Absent (maps written before this field existed) reads as `false`, which is
   * the whole point — those are precisely the maps the one-shot exists for.
   */
  pushIdentifierProbed?: boolean;
  /**
   * `true` means "the last thing that happened was a deliberate sign-out".
   *
   * Persisted, because relaunch is exactly the case it exists to survive. It is
   * what distinguishes *"deliberately signed out"* from *"nothing selected
   * yet"* — two states that both carry `activeAccountId: null`, and which
   * `useAccountSync` Phase A must tell apart: it falls back to the first stored
   * account when nothing was ever selected, and must NOT do that after a
   * deliberate sign-out (that would silently drop the user into an identity
   * they did not choose, on every launch).
   *
   * Absent (maps written before this field existed) reads as `false` — the
   * pre-existing "pick the first account" behavior, unchanged.
   */
  signedOut?: boolean;
}

export interface AccountsState {
  accounts: Record<string, AccountEntry>;
  activeAccountId: string | null;
  /**
   * See `AccountMap.deviceIdentifier`. It needs a Redux home and not just a
   * storage slot: `useAccountSync` Phase C builds the persisted map out of this
   * state, so without a field here every persist would silently drop it — and
   * the sign-out callers have to read it synchronously while building their
   * request, where `AccountStorage` is not reachable.
   */
  deviceIdentifier: PushDeviceIdentifier | null;
  /** See `AccountMap.pushIdentifierProbed`. */
  pushIdentifierProbed: boolean;
  /** See `AccountMap.signedOut`. */
  signedOut: boolean;
  /**
   * Set when an account could not be admitted because the map is already at
   * `MAX_ACCOUNTS`. Secondary to the rejection the call site raises — this is
   * for UI that prefers reading a flag, and it is the ONLY channel on the two
   * OAuth paths, whose entry point is synchronous and cannot reject its caller.
   *
   * Cleared on any successful admission and on any removal, so an app does not
   * keep rendering the cap error after the user frees a slot and retries.
   *
   * ⚠ THE CLEAR IS ASYNCHRONOUS, and reading the flag eagerly is the one way to
   * get a wrong answer out of it. The clear rides `upsertAccount`, which for a
   * re-auth is dispatched by `useAccountSync`'s Phase B — a `useEffect`. So it
   * lands ONE RENDER AFTER the sign-in call resolves, not synchronously inside
   * it. Code that awaits a successful re-auth and then reads
   * `useAccounts().accountLimitReached` from the same tick reads the value from
   * before the effect flushed, which is whatever an earlier, unrelated refusal
   * left behind. Render off it instead — the next render has the right value.
   */
  accountLimitReached: boolean;
  isReady: boolean;
  accountManagerRegistered: boolean;
}

export const MAX_ACCOUNTS = 5;

/**
 * Whether admitting `userId` into `accounts` would exceed `MAX_ACCOUNTS`.
 *
 * **An id already in the map is never an admission** — it is the same person
 * signing in again, and re-authenticating an account you are already storing
 * has to work at the cap or a user with five accounts can never sign back into
 * any of them. That is the whole reason the authoritative cap check is keyed on
 * the resolved `user.id` and runs *after* authentication: the identity has to
 * be known before "is this new?" can be answered. Matching a typed email
 * against the stored summaries beforehand looks equivalent and is not — a
 * summary can hold a stale email, a null one (accounts admitted through
 * `verifyExternalUser`), or the same address in different case.
 *
 * Pass no `userId` for the pre-flight on sign-UP, where the answer is
 * unconditional: a sign-up creates a person who by definition is not in the map.
 */
export function wouldExceedAccountLimit(
  accounts: Record<string, AccountEntry>,
  userId?: string | null
): boolean {
  if (userId && accounts[userId]) return false;
  return Object.keys(accounts).length >= MAX_ACCOUNTS;
}

/**
 * Folds a freshly built entry over the stored one without losing client-owned
 * fields.
 *
 * `undefined` on the incoming side means "the builder had nothing to say about
 * this", not "clear it" — Phase B constructs its entry from the live session
 * and knows nothing about `pushEnabled` or about summary fields the current
 * user object happens not to carry. Anything the caller means to clear it sends
 * as an explicit `null` / `false`, which does overwrite.
 */
function mergeAccountEntry(
  existing: AccountEntry,
  incoming: AccountEntry
): AccountEntry {
  const merged: AccountEntry = { ...existing };

  for (const [key, value] of Object.entries(incoming)) {
    if (value === undefined || key === "user") continue;
    (merged as unknown as Record<string, unknown>)[key] = value;
  }

  merged.user = { ...existing.user };
  for (const [key, value] of Object.entries(incoming.user ?? {})) {
    if (value === undefined) continue;
    (merged.user as unknown as Record<string, unknown>)[key] = value;
  }

  return merged;
}

// Slice

const initialState: AccountsState = {
  accounts: {},
  activeAccountId: null,
  deviceIdentifier: null,
  pushIdentifierProbed: false,
  signedOut: false,
  accountLimitReached: false,
  isReady: false,
  accountManagerRegistered: false,
};

const accountsSlice = createSlice({
  name: "accounts",
  initialState,
  reducers: {
    setAccountMap: (state, action: PayloadAction<AccountMap>) => {
      state.accounts = action.payload.accounts;
      state.activeAccountId = action.payload.activeAccountId;
      state.signedOut = action.payload.signedOut ?? false;
      state.deviceIdentifier = action.payload.deviceIdentifier ?? null;
      // Absent reads as `false` — a map written before this field existed is
      // exactly the population the one-shot read exists for.
      state.pushIdentifierProbed = action.payload.pushIdentifierProbed ?? false;
    },
    upsertAccount: (
      state,
      action: PayloadAction<{ userId: string; entry: AccountEntry }>
    ) => {
      const { userId, entry } = action.payload;
      const existing = state.accounts[userId];
      if (!existing && Object.keys(state.accounts).length >= MAX_ACCOUNTS) {
        // Limit reached — the account is not admitted. Recorded rather than
        // silently ignored so `useAddAccount`/`useAccounts` can surface it.
        state.accountLimitReached = true;
        return;
      }
      // MERGE, never replace. Phase B rebuilds an entry literal from
      // `refreshToken` + `user` every time the refresh token changes — i.e. on
      // every launch and every transition, since the server rotates it on each
      // exchange. A wholesale assignment therefore erased `pushEnabled` on a
      // cadence: switch into an account you had deliberately silenced, its entry
      // is rebuilt without the flag, absent-reads-as-enabled, and it is
      // re-registered. Client-owned fields have to be preserved by
      // construction, not by hoping the rebuilder repopulates them.
      state.accounts[userId] = existing
        ? mergeAccountEntry(existing, entry)
        : entry;
      state.accountLimitReached = false;
    },
    setDeviceIdentifier: (
      state,
      action: PayloadAction<PushDeviceIdentifier | null>
    ) => {
      state.deviceIdentifier = action.payload;
    },
    /**
     * Burns the one-time unconditional push-identifier read. See
     * `AccountMap.pushIdentifierProbed`.
     *
     * One-way on purpose: there is no un-marking action, because the thing it
     * records — "the read that ignores permission has had its chance" — cannot
     * become untrue. Callers must persist after dispatching it, or the one-shot
     * fires again on the next launch.
     */
    markPushIdentifierProbed: (state) => {
      state.pushIdentifierProbed = true;
    },
    /**
     * Records whether an account wants push on THIS device.
     *
     * A dedicated reducer rather than an `upsertAccount` with a partial entry:
     * `upsertAccount` takes a whole `AccountEntry` (it is the path that rebuilds
     * one from a rotated refresh token) and enforces the account cap, neither of
     * which applies to flipping one client-owned boolean on an account that is
     * already stored. Unknown ids are ignored — there is nothing to express a
     * preference about.
     *
     * The value is written as an explicit boolean, never left absent, so the
     * "absent means never expressed a preference" reading stays true.
     */
    setAccountPushEnabled: (
      state,
      action: PayloadAction<{ userId: string; enabled: boolean }>
    ) => {
      const entry = state.accounts[action.payload.userId];
      if (!entry) return;
      entry.pushEnabled = action.payload.enabled;
    },
    /**
     * Writes a rotated refresh token onto an account that is ALREADY stored.
     *
     * UPDATE-ONLY, and that is the entire reason it exists separately from
     * `upsertAccount`. The credential write happens after a network round trip,
     * and an account can be removed (`removeAccount`, `clearAllAccounts`)
     * while that round trip is in flight. `upsertAccount` CREATES when the key
     * is absent, so writing a rotated credential through it resurrected the
     * removed account — with a live successor token and the user's summary
     * persisted back to disk, fully usable again, because the sign-out that
     * removed it spent the OLD token and not the successor. In the variant
     * where the map was at `MAX_ACCOUNTS`, the write was instead silently
     * refused while the caller reported success, leaving the map holding a
     * revoked token that trips reuse detection on its next use.
     *
     * Unknown ids are ignored, matching `setAccountPushEnabled` and
     * `setAccountNeedsReauth`: an account that is not stored has no credential
     * to carry. Callers that must not proceed on a vanished account check for
     * themselves — see `mintAccountAccessToken`, which re-reads after its await
     * and fails rather than returning a session for an account that is gone.
     *
     * Touches the credential fields only. The summary is not the exchange's to
     * update — it learns nothing new about the user — and leaving it alone is
     * also what keeps a removed account's email from being written back.
     */
    setAccountCredential: (
      state,
      action: PayloadAction<{
        userId: string;
        refreshToken: string;
        tokenExpiresAt: number;
      }>
    ) => {
      const entry = state.accounts[action.payload.userId];
      if (!entry) return;
      entry.refreshToken = action.payload.refreshToken;
      entry.tokenExpiresAt = action.payload.tokenExpiresAt;
    },
    /**
     * Records that this account's stored credential was refused (or clears the
     * record).
     *
     * Setting is written as an explicit `true`; CLEARING deletes the field
     * rather than writing `false`, so "healthy" stays the absent state the
     * merge semantics already treat as "no opinion" — and so an entry that has
     * never failed costs nothing on Expo's per-value byte budget.
     *
     * Unknown ids are ignored: an account that is not stored has no marker to
     * carry, and `activateStoredAccount` can legitimately be asked for one.
     */
    setAccountNeedsReauth: (
      state,
      action: PayloadAction<{ userId: string; needsReauth: boolean }>
    ) => {
      const entry = state.accounts[action.payload.userId];
      if (!entry) return;
      if (action.payload.needsReauth) entry.needsReauth = true;
      else delete entry.needsReauth;
    },
    /**
     * Records that this account's push binding is stale (or clears the record).
     *
     * Written when the device's push identifier changes while the account is
     * not active, and cleared when the activation-time reconcile has actually
     * re-bound it. The mark is DURABLE: the rotation it records happens once,
     * and the repair may be several launches away.
     *
     * Set writes an explicit `true`; clearing DELETES the field rather than
     * writing `false`, matching `setAccountNeedsReauth` — "nothing to repair"
     * stays the absent state that `mergeAccountEntry` already treats as "no
     * opinion", so Phase B rebuilding the entry on every token rotation cannot
     * erase or resurrect it, and a device that has never rotated costs nothing
     * on Expo's per-value byte budget.
     *
     * Unknown ids are ignored, matching the sibling reducers.
     */
    setAccountNeedsPushRebind: (
      state,
      action: PayloadAction<{ userId: string; needsRebind: boolean }>
    ) => {
      const entry = state.accounts[action.payload.userId];
      if (!entry) return;
      if (action.payload.needsRebind) entry.needsPushRebind = true;
      else delete entry.needsPushRebind;
    },
    removeAccount: (state, action: PayloadAction<string>) => {
      delete state.accounts[action.payload];
      if (state.activeAccountId === action.payload) {
        // NO successor selection. Removing (or signing out of) the active
        // account ends the session and leaves nothing active — choosing the
        // next identity is the app's decision, not the SDK's. Assigning
        // `remaining[0]` here is what used to silently land the user inside the
        // oldest account they ever added.
        //
        // `signedOut` rides along because the pointer alone is ambiguous:
        // without it Phase A reads `null` as "pick the first stored account"
        // and re-creates exactly the behavior this removes, one launch later.
        state.activeAccountId = null;
        state.signedOut = true;
      }
      state.accountLimitReached = false;
    },
    setActiveAccount: (state, action: PayloadAction<string | null>) => {
      state.activeAccountId = action.payload;
      // Activating an account is the defined clearing point for the signed-out
      // flag — it means "the last thing that happened was a deliberate
      // sign-out", and this is no longer that. Without a clearing point the
      // user lands at the account picker on every launch, forever.
      if (action.payload) {
        state.signedOut = false;

        // ...and the defined clearing point for that account's re-auth marker.
        //
        // It lives HERE rather than in `activateStoredAccount` so it covers the
        // other way a dead account comes back to life: signing into it again.
        // That path never touches the transition core — `useAccountSync` Phase
        // B upserts the entry and dispatches this action — so a marker cleared
        // only in the transition core would survive a successful re-auth and
        // leave the switcher showing "sign in again" forever.
        //
        // Since validate-before-commit, no failure path selects anything: the
        // transition core selects only after the credential has been proven,
        // so every dispatch carrying an id is an activation that worked. The
        // one near-exception is `refuseAtAccountLimit` restoring the PREVIOUS
        // selection, and that account cannot be carrying a marker — it was the
        // live session a moment earlier.
        //
        // `needsPushRebind` is deliberately NOT cleared here. Selecting an
        // account proves its credential; it does not re-create its push
        // binding. That is `reconcileAccountPushBinding`'s job, it runs a beat
        // later and it can fail — clearing the mark on selection would report
        // the repair done whenever the account was merely opened.
        const entry = state.accounts[action.payload];
        if (entry) delete entry.needsReauth;
      }
    },
    setSignedOut: (state, action: PayloadAction<boolean>) => {
      state.signedOut = action.payload;
    },
    setAccountLimitReached: (state, action: PayloadAction<boolean>) => {
      state.accountLimitReached = action.payload;
    },
    clearAllAccounts: (state) => {
      state.accounts = {};
      state.activeAccountId = null;
      // Sign-out-all is deliberate by definition.
      state.signedOut = true;
      state.accountLimitReached = false;
      // `deviceIdentifier` is deliberately NOT cleared. It is device state, not
      // account state: this device's push token does not stop being this
      // device's token because nobody is signed in, and losing it would leave
      // the next sign-in unable to reconcile its bindings. Only
      // `deleteAccountMap` — a full wipe — drops it.
      //
      // Neither is `pushIdentifierProbed`, for the same reason and one more:
      // clearing it would re-arm the one-time permission-ignoring read on every
      // sign-out-all, which is the opposite of once.
    },
    setAccountsReady: (state, action: PayloadAction<boolean>) => {
      state.isReady = action.payload;
    },
    registerAccountManager: (state) => {
      state.accountManagerRegistered = true;
    },
  },
});

export const {
  setAccountMap,
  upsertAccount,
  setDeviceIdentifier,
  markPushIdentifierProbed,
  setAccountPushEnabled,
  setAccountCredential,
  setAccountNeedsReauth,
  setAccountNeedsPushRebind,
  removeAccount,
  setActiveAccount,
  setSignedOut,
  setAccountLimitReached,
  clearAllAccounts,
  setAccountsReady,
  registerAccountManager,
} = accountsSlice.actions;

/**
 * Builds the persistable `AccountMap` out of the slice's current state.
 *
 * The single definition of what a persisted map contains, shared by
 * `useAccountSync` Phase C and by the non-React callers that must AWAIT a write
 * before continuing (the minted-token helper, push reconciliation, the
 * per-account push toggle). Those callers hold `getState`, not a React
 * subscription, and a second hand-rolled literal is how a field silently stops
 * being persisted.
 *
 * Returns a fresh object on every call, so it is a snapshot builder for
 * imperative callers — do NOT pass it to `useSelector`, which would re-render on
 * every store action.
 */
export function buildAccountMap(state: AccountsState): AccountMap {
  return {
    activeAccountId: state.activeAccountId,
    accounts: state.accounts,
    signedOut: state.signedOut,
    deviceIdentifier: state.deviceIdentifier,
    pushIdentifierProbed: state.pushIdentifierProbed,
  };
}

/** `buildAccountMap` against a full root state — for `getState()` callers. */
export function selectAccountMapSnapshot(state: {
  sublay: SublayState;
}): AccountMap {
  return buildAccountMap(state.sublay.accounts);
}

// Selectors — namespaced for dual-mode support
export const selectAccounts = (state: { sublay: SublayState }) =>
  state.sublay.accounts.accounts;
export const selectActiveAccountId = (state: { sublay: SublayState }) =>
  state.sublay.accounts.activeAccountId;
export const selectSignedOut = (state: { sublay: SublayState }) =>
  state.sublay.accounts.signedOut;
export const selectDeviceIdentifier = (state: { sublay: SublayState }) =>
  state.sublay.accounts.deviceIdentifier;
export const selectAccountLimitReached = (state: { sublay: SublayState }) =>
  state.sublay.accounts.accountLimitReached;
export const selectAccountsReady = (state: { sublay: SublayState }) =>
  state.sublay.accounts.isReady;
export const selectAccountManagerRegistered = (state: { sublay: SublayState }) =>
  state.sublay.accounts.accountManagerRegistered;

export default accountsSlice.reducer;
