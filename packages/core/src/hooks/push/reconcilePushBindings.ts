// Push binding reconciliation (PRD R9).
//
// THE RULE: the stored `pushEnabled` flag is durable INTENT; a server
// `PushDevices` row is disposable STATE; reconciling makes rows match flags.
//
// Neither substitutes for the other. There is no endpoint listing which
// accounts are bound to a device (the router exposes register/deregister only),
// so intent cannot be read back from the server; and device tokens rotate on
// reinstall, OS refresh and backup restore, invalidating every row while intent
// is untouched.
//
// Registration is an upsert, so reconciling is IDEMPOTENT — which is what lets
// it repair a rotated device token without having to detect one.
//
// ─────────────────────────────────────────────────────────────────────────────
// ⚠ NOTHING HERE MAY SPEND A BACKGROUND ACCOUNT'S CREDENTIAL
// ─────────────────────────────────────────────────────────────────────────────
// Minting an access token for a non-active account is not free: the exchange
// ROTATES, revoking the presented refresh token (see `mintAccountAccessToken`).
// The revocation and the successor's durable write cannot be made atomic by any
// client-side code, so an interruption in between — the app swiped away, an iOS
// suspension, a dropped connection — leaves the stored copy dead and the
// successor unsaved. That account is then permanently locked out, and to the
// user it looks like a random logout.
//
// A background pass therefore takes that risk on the user's behalf, for an
// account they are not even looking at, up to five at a time, at launch. It
// used to. It does not any more:
//
//   (a) ACCOUNT TRANSITION → `reconcileAccountPushBinding` for the newly active
//       account ONLY. Free: its session is already live, so it authorizes with
//       the live access token and mints nothing.
//   (b) TOGGLE CHANGE → that one account, via `applyAccountPushBinding`. This
//       is the ONE path that still mints for a non-active account, and it is
//       allowed to: the user asked for it, it is foregrounded, it is one
//       account, and it reports its own failure so a retry is available.
//   (c) AFTER A SUCCESSFUL `register()`, OR A DEVICE-TOKEN CHANGE →
//       `markPushBindingsForRebind`. MARKS the background accounts and binds
//       only the active one. No exchange happens for anybody else; each marked
//       account is repaired by (a) when the user next switches into it.
//
// The accepted cost of (c) is that a push-enabled account the user never opens
// stops receiving notifications after a device-token rotation until they next
// open it. That is close to what already happened — a failed background re-bind
// lost push silently and never recovered — except that this version self-heals
// and cannot destroy an account.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHICH ACCOUNTS: `accountOptedIntoPush`, NOT `isAccountPushEnabled`
// ─────────────────────────────────────────────────────────────────────────────
// Binding is gated on an EXPLICIT `pushEnabled === true`. An absent preference
// is not consent — it means the account has never been asked — and acting on it
// caused two distinct failures:
//
//   - A plain sign-in on a shared device bound the new account to an identifier
//     the previous user left behind. Nobody granted anything and the app never
//     called `register()`.
//   - Marking and binding disagreed. If a mark were raised on the looser rule
//     while activation applied the stricter one, an account that predates the
//     preference would be marked, never repaired, and would show "notifications
//     paused — open to resume" forever on an account that opening never fixes.
//
// Both sides of that seam read `accountOptedIntoPush`. `isAccountPushEnabled`
// stays what it always was — the value a toggle renders — and is not consulted
// here.
//
// An explicitly SILENCED account is skipped by (c) rather than deregistered:
// on a token change the new token has no bindings at all, and on the
// `register()` path a silenced account was already unbound when it was
// silenced — so the DELETE would be a no-op bought with a rotation of that
// account's refresh token.

import axios from "../../config/axios";
import { getAuthorizedTokenForAccount } from "../../config/authGate";
import type { AppDispatch } from "../../store/types";
import {
  accountOptedIntoPush,
  accountNeedsPushRebind,
  setAccountNeedsPushRebind,
  selectAccountMapSnapshot,
  type AccountEntry,
} from "../../store/slices/accountsSlice";
import { persistAccountMapFor } from "../../config/accountStorage";
import type { PushDeviceIdentifier } from "../../interfaces/PushTokenAdapter";
import { handleError } from "../../utils/handleError";
import {
  mintAccountAccessToken,
  type GetSublayState,
} from "./mintAccountAccessToken";

export interface PushReconcileContext {
  dispatch: AppDispatch;
  getState: GetSublayState;
  projectId: string;
}

/**
 * Structural equality for two device identifiers.
 *
 * Web subscriptions are objects, so `===` is wrong for them; comparing the
 * endpoint alone is not enough either, because a browser can re-issue the same
 * endpoint with fresh keys.
 */
export function pushIdentifiersEqual(
  a: PushDeviceIdentifier | null | undefined,
  b: PushDeviceIdentifier | null | undefined
): boolean {
  if (!a || !b) return a === b;
  if (a.platform !== b.platform) return false;
  if (a.platform === "web" && b.platform === "web") {
    return (
      a.subscription.endpoint === b.subscription.endpoint &&
      a.subscription.keys.p256dh === b.subscription.keys.p256dh &&
      a.subscription.keys.auth === b.subscription.keys.auth
    );
  }
  return (
    "token" in a && "token" in b && a.token === b.token
  );
}

/**
 * Resolves the bearer token to act as `userId`.
 *
 * The active account uses its LIVE session — through the auth gate, so a cold
 * start waits for the bootstrap and a near-expiry token rotates once, exactly
 * like every other authenticated call. Only a non-active account mints, and a
 * mint is a rotation.
 *
 * ⚠ THE MINT BRANCH HAS EXACTLY ONE CALLER LEFT: the per-account toggle acting
 * on an account the user is not signed into. Reconciliation no longer reaches
 * it from either direction — the activation path is by definition the active
 * account, and the bulk path marks instead of binding. If a new caller appears
 * here, check first that it is a deliberate, foregrounded user action; a
 * background one is the failure mode described at the top of this file.
 */
async function resolveAccessToken(
  ctx: PushReconcileContext,
  userId: string
): Promise<string> {
  const { sublay } = ctx.getState();

  if (userId === sublay.accounts.activeAccountId) {
    const token = await getAuthorizedTokenForAccount(sublay.auth.accessToken);
    if (!token) {
      throw new Error(
        `No live access token for the active account ${userId}; cannot reconcile its push binding.`
      );
    }
    return token;
  }

  return mintAccountAccessToken({
    dispatch: ctx.dispatch,
    getState: ctx.getState,
    projectId: ctx.projectId,
    userId,
  });
}

/**
 * Binds or unbinds ONE account against this device's stored identifier.
 *
 * Takes `enabled` explicitly rather than reading the flag, because the toggle
 * must apply the new binding BEFORE the flag is written — the SDK may never
 * report an account as push-enabled while nothing is bound.
 *
 * A no-op when no device identifier is stored: the device has never registered,
 * so there is nothing to bind and nothing to unbind.
 *
 * Goes out over the bare public axios instance with an explicit Authorization
 * header. `baseApi`/`axiosPrivate` would inject the ACTIVE account's token,
 * which is the wrong identity for every non-active account.
 *
 * **Resolves `true` only when a bind/unbind actually went out**, and `false` on
 * the no-op above. Callers that record something as repaired have to be able to
 * tell the two apart: "the request succeeded" and "there was no request" both
 * resolve, and treating the second as the first clears a `needsPushRebind`
 * marker that nothing has repaired — reporting an account as bound while
 * nothing is.
 */
export async function applyAccountPushBinding(
  ctx: PushReconcileContext,
  userId: string,
  enabled: boolean
): Promise<boolean> {
  const { sublay } = ctx.getState();
  const identifier = sublay.accounts.deviceIdentifier;
  if (!identifier) return false;

  const accessToken = await resolveAccessToken(ctx, userId);
  const url = `/${ctx.projectId}/push-notifications/devices`;
  const config = { headers: { Authorization: `Bearer ${accessToken}` } };

  if (enabled) {
    await axios.post(url, identifier, config);
  } else {
    // Deregistration is idempotent server-side (Phase 1), so an unbind for an
    // account that was never bound is a clean 200 rather than an error.
    await axios.delete(url, { ...config, data: identifier });
  }

  return true;
}

/**
 * Writes the account map, best-effort.
 *
 * The re-bind marker is durable state — the rotation that raises it happens
 * once and the repair may be several launches away — so it has to reach
 * storage rather than living in Redux until the next unrelated persist.
 *
 * A failed write must not fail the caller: by the time this runs the
 * server-side outcome is already decided, and `useAccountSync` Phase C gets an
 * unawaited second attempt off the same state change.
 */
async function persistAccounts(ctx: PushReconcileContext): Promise<void> {
  try {
    await persistAccountMapFor(
      ctx.projectId,
      selectAccountMapSnapshot(ctx.getState())
    );
  } catch (error) {
    handleError(error, "Failed to persist push binding state");
  }
}

/**
 * Makes ONE account's server binding match its stored intent, and clears its
 * re-bind marker once it has.
 *
 * Path (a) and path (b) in the header. Unknown accounts are a no-op.
 *
 * **An account that has never expressed a preference is left completely
 * alone** — not bound, not unbound. Absent is "never asked", and the activation
 * path is reached on every sign-in, so reading absent as consent here is what
 * bound a fresh account on a shared device to an identifier the previous user
 * left behind. It is also the rule `markPushBindingsForRebind` applies, so the
 * two cannot disagree about which accounts are in play.
 *
 * The marker is cleared only after `applyAccountPushBinding` RESOLVES WITH A
 * REQUEST HAVING GONE OUT: a throw leaves it standing, so the next activation
 * tries again, and so does the no-request no-op — a resolved promise is not by
 * itself evidence of a repair. It is cleared on the silenced path too — an
 * account whose binding has been removed to match its intent has nothing left
 * to repair.
 */
export async function reconcileAccountPushBinding(
  ctx: PushReconcileContext,
  userId: string
): Promise<void> {
  const entry: AccountEntry | undefined =
    ctx.getState().sublay.accounts.accounts[userId];
  if (!entry) return;

  if (entry.pushEnabled === undefined) return;

  const bindingApplied = await applyAccountPushBinding(
    ctx,
    userId,
    accountOptedIntoPush(entry)
  );

  // NOTHING WENT OUT → NOTHING WAS REPAIRED. With no device identifier stored
  // `applyAccountPushBinding` resolves without a request, and clearing the
  // marker off that would report a re-bind that never happened — on the one
  // marker whose whole job is to say the binding is stale. It also drops the
  // account's only route back: this path and the toggle are what clear it, and
  // both are no-ops until an identifier exists. (`markPushBindingsForRebind`
  // reaches the same conclusion one step earlier, with a function-level
  // identifier guard; here the account lookups above run either way, so the
  // return value is the cheaper seam.)
  if (!bindingApplied) return;

  // Re-read: `applyAccountPushBinding` awaits a round trip, and the account can
  // be removed under it.
  const current = ctx.getState().sublay.accounts.accounts[userId];
  if (!current || !accountNeedsPushRebind(current)) return;

  ctx.dispatch(setAccountNeedsPushRebind({ userId, needsRebind: false }));
  await persistAccounts(ctx);
}

/**
 * Path (c): records that every opted-in BACKGROUND account needs re-binding,
 * and re-binds the active one on the spot.
 *
 * ⚠ Only two callers may ever reach this — a successful `register()` and a
 * device-token change. They are the only two moments the device identifier can
 * be new.
 *
 * **Nothing here exchanges a credential.** That is the whole difference from
 * the bulk loop this replaces: a background account is marked, not spent. The
 * active account is bound immediately because it costs nothing to — its
 * session is already live, so `resolveAccessToken` takes the live-token branch
 * and never reaches the mint.
 *
 * Marks are raised before the active account's request goes out, so an
 * identifier change that is interrupted mid-flight still leaves the record of
 * what needs repairing. The single persist at the end covers both.
 *
 * The active account is marked TOO when its own re-bind fails — it is the one
 * account with no self-healing loop of its own, so without a mark it went
 * quiet with nothing on screen to say so. The mark comes off again as soon as
 * a later reconcile binds it.
 */
export async function markPushBindingsForRebind(
  ctx: PushReconcileContext,
  options?: {
    /**
     * Restrict marking to these background accounts. Omit to mark every
     * opted-in background account, which is what a genuine identifier change
     * calls for.
     *
     * The narrow form exists for the other reason an account can need a
     * binding it does not have: a repeat `register()` on an UNCHANGED
     * identifier, which flips accounts that had never expressed a preference
     * to enabled. Those have no binding and nothing else would ever create
     * one, while every already-bound account is exactly as valid as it was and
     * must not be told its notifications are paused.
     */
    accountIds?: readonly string[];
  }
): Promise<void> {
  const { sublay } = ctx.getState();
  if (!sublay.accounts.deviceIdentifier) return;

  const activeAccountId = sublay.accounts.activeAccountId;
  const restrictTo = options?.accountIds
    ? new Set(options.accountIds)
    : null;
  let dirty = false;

  for (const [userId, entry] of Object.entries(sublay.accounts.accounts)) {
    // Explicit opt-in only, and the active account is repaired rather than
    // marked — see the header for both.
    if (userId === activeAccountId) continue;
    if (restrictTo && !restrictTo.has(userId)) continue;
    if (!accountOptedIntoPush(entry)) continue;

    ctx.dispatch(setAccountNeedsPushRebind({ userId, needsRebind: true }));
    dirty = true;
  }

  const activeEntry = activeAccountId
    ? sublay.accounts.accounts[activeAccountId]
    : undefined;

  // The restriction governs the active account too. A narrow call names the
  // accounts a repeat `register()` just flipped from "never asked" to enabled,
  // and that same `register()` has already bound the active account itself — so
  // re-POSTing for it here is work nobody asked for. (Idempotent, so this was
  // never a live bug; it read as one half of the loop's rule being forgotten.)
  // A full call passes no restriction and still re-binds, which is the case
  // that matters: on a genuine identifier change the active account's binding
  // points at a token this device no longer holds.
  //
  // ONE EXCEPTION, and it is why this is not a bare `restrictTo.has(...)`: an
  // active account CARRYING A MARK still runs. The mark comes off only after a
  // bind resolves, so skipping the request would leave the account the user is
  // looking at reporting "notifications paused" with nothing left to clear it.
  const activeIsInScope =
    !!activeAccountId &&
    !!activeEntry &&
    (!restrictTo ||
      restrictTo.has(activeAccountId) ||
      accountNeedsPushRebind(activeEntry));

  if (activeIsInScope && activeAccountId && activeEntry && accountOptedIntoPush(activeEntry)) {
    try {
      await applyAccountPushBinding(ctx, activeAccountId, true);

      // Bound — so if this account was carrying a mark from an earlier failure
      // (see the catch below), it is repaired and the mark comes off. Re-read:
      // the request above awaited a round trip and the account can be removed
      // under it.
      const current =
        ctx.getState().sublay.accounts.accounts[activeAccountId];
      if (current && accountNeedsPushRebind(current)) {
        ctx.dispatch(
          setAccountNeedsPushRebind({
            userId: activeAccountId,
            needsRebind: false,
          })
        );
        dirty = true;
      }
    } catch (error) {
      // MARK IT TOO. The active account is the one the user is looking at, and
      // it used to be the only account with neither self-healing nor a visible
      // marker: it is skipped by the loop above (it is re-bound instead), so a
      // failed re-bind left it silently unbound while the switcher reported it
      // as fine. The mark is what makes "notifications paused — open to resume"
      // true for it as well, and it is cleared by the next successful
      // reconcile — `useAccountSync` Phase E on the next activation or the next
      // identifier change, or the success branch just above.
      //
      // Still logged rather than thrown: `register()` reports on the
      // registration that already succeeded, and a device-token change has
      // nobody to report to.
      if (ctx.getState().sublay.accounts.accounts[activeAccountId]) {
        ctx.dispatch(
          setAccountNeedsPushRebind({
            userId: activeAccountId,
            needsRebind: true,
          })
        );
        dirty = true;
      }
      handleError(
        error,
        `Failed to re-bind the push binding for account ${activeAccountId}`
      );
    }
  }

  if (dirty) await persistAccounts(ctx);
}
