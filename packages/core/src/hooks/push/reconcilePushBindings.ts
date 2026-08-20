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
// ⚠ WHEN IT MAY RUN — the constraint the whole design is built around
// ─────────────────────────────────────────────────────────────────────────────
// Minting an access token for a non-active account is not free: the exchange
// ROTATES, revoking the presented refresh token (see `mintAccountAccessToken`).
// So a naive "reconcile every stored account on every transition" loop would
// revoke four stored tokens per switch, leave the map holding the revoked
// copies, and then permanently destroy each of those accounts on the next pass.
// It would systematically kill every account the user is not currently using.
//
//   (a) ACCOUNT TRANSITION → `reconcileAccountPushBinding` for the newly active
//       account ONLY. Free: its session is already live, no mint is involved.
//       **This path must never call `reconcileAllPushBindings`.**
//   (b) TOGGLE CHANGE → that one account (one mint if it is not the active one).
//   (c) AFTER A SUCCESSFUL `register()`, OR A DEVICE-TOKEN CHANGE →
//       `reconcileAllPushBindings`. The only bulk path, and the only two moments
//       the device token can be new. Explicit, rare, and deliberately NOT a
//       mounted effect.
//
// The bulk loop covers ENABLED accounts only. A silenced account is skipped
// rather than deregistered, which is both correct and cheap: on a token change
// the new token has no bindings at all, and on the `register()` path a silenced
// account was already unbound when it was silenced — so the DELETE would be a
// no-op bought with a rotation of that account's refresh token.

import axios from "../../config/axios";
import { getAuthorizedTokenForAccount } from "../../config/authGate";
import type { AppDispatch } from "../../store/types";
import {
  isAccountPushEnabled,
  type AccountEntry,
} from "../../store/slices/accountsSlice";
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
 */
export async function applyAccountPushBinding(
  ctx: PushReconcileContext,
  userId: string,
  enabled: boolean
): Promise<void> {
  const { sublay } = ctx.getState();
  const identifier = sublay.accounts.deviceIdentifier;
  if (!identifier) return;

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
}

/**
 * Makes ONE account's server binding match its stored intent.
 *
 * Path (a) and path (b) in the header. Unknown accounts are a no-op.
 */
export async function reconcileAccountPushBinding(
  ctx: PushReconcileContext,
  userId: string
): Promise<void> {
  const entry: AccountEntry | undefined =
    ctx.getState().sublay.accounts.accounts[userId];
  if (!entry) return;

  await applyAccountPushBinding(ctx, userId, isAccountPushEnabled(entry));
}

/**
 * Path (c): re-binds every ENABLED stored account onto this device's current
 * identifier.
 *
 * ⚠ Only two callers may ever reach this — a successful `register()` and a
 * device-token change. Calling it from a transition is the failure mode
 * described in the header.
 *
 * Sequential rather than parallel: each non-active account costs one rotating
 * token exchange plus an awaited storage write, and the writes serialize on the
 * project mutex anyway. Per-account failures are logged and skipped so one dead
 * stored account cannot stop the rest of the device from being re-bound.
 */
export async function reconcileAllPushBindings(
  ctx: PushReconcileContext
): Promise<void> {
  const { sublay } = ctx.getState();
  if (!sublay.accounts.deviceIdentifier) return;

  const entries = Object.entries(sublay.accounts.accounts);

  for (const [userId, entry] of entries) {
    // Silenced accounts are left alone — see the header for why deregistering
    // them here would be a no-op bought with a token rotation.
    if (!isAccountPushEnabled(entry)) continue;

    try {
      await applyAccountPushBinding(ctx, userId, true);
    } catch (error) {
      handleError(
        error,
        `Failed to reconcile the push binding for account ${userId}`
      );
    }
  }
}
