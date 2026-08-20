// Minting an access token for a NON-ACTIVE stored account.
//
// ⚠ THE MOST DANGEROUS HELPER IN THE SDK. Read this before touching it.
//
// `/auth/request-new-access-token` ROTATES: presenting a refresh token revokes
// it and issues a successor in the same family. Re-presenting a revoked token
// trips the server's reuse detection, which **destroys that account's entire
// token family** — the user is signed out of that account with no route back,
// because the credential needed to recover it is the one that was just
// invalidated.
//
// Two rules follow, and neither is optional:
//
//  1. THE SUCCESSOR MUST BE DURABLY STORED BEFORE THE MINT IS COMPLETE. The
//     write is AWAITED, through the same per-project mutex every other persist
//     goes through. Fire-and-forget is not acceptable here: if the process dies
//     between the server rotating and the map recording, the stored token is
//     already revoked and the next attempt destroys the family. The grace
//     window is narrower than it sounds — inside it the server returns the
//     family's live successor only if an unrevoked one exists, and otherwise
//     destroys the family within the window too.
//
//  2. IT BYPASSES THE SHARED API CLIENT. `baseApi`'s `prepareHeaders` (and
//     `axiosPrivate`'s request interceptor) always inject the *active*
//     account's token, and the auth gate would park the call across a switch.
//     This exchange must carry the TARGET account's credential in the body and
//     nothing else, so it goes out over the bare public axios instance, which
//     carries no interceptors at all.
//
// Single-flighted per (project, account) so two reconciliations racing for the
// same account cannot present the same refresh token twice — which is the
// reuse-detection trigger, self-inflicted.
//
// ⚠ THE SINGLE-FLIGHT BOUNDARY IS ONE JS CONTEXT. `inFlight` is module state,
// so it serializes racing callers inside a single app instance and nothing
// beyond it. Two browser tabs — each with its own module instance — that both
// remount after a subscription rotation can therefore each present the same
// stored non-active refresh token. What keeps that theoretical rather than
// live:
//
//   - The write mutex plus Phase D's cross-tab `storage` sync converge the tabs
//     on the successor.
//   - The server's ~30s grace window returns the family's live successor rather
//     than destroying it, when an unrevoked one exists.
//   - Reaching the bulk loop at all is rare, though for DIFFERENT reasons on
//     the two paths that reach it, and only one of them is user-initiated:
//     `register()` is a deliberate user action, so two tabs racing it is
//     already unusual. The rotation path is NOT user-initiated — on web it is
//     `subscribeToWebPushIdentifierChanges`, a comparison run from a mount
//     effect — but it is gated on `pushIdentifiersEqual` finding an ACTUAL
//     difference, so an ordinary mount never reaches the loop; only a genuine
//     rotation does, and only on the first tabs to observe it.
//
// It is also the SAME class of exposure the ordinary active-account refresh
// already carries across tabs. Read "cannot present the same token twice" as
// in-context, not absolute.
//
// ONE CALLER by design: push reconciliation for a non-active account. Do not
// widen it into a general "act as any stored account" capability.

import axios from "../../config/axios";
import type { AppDispatch } from "../../store/types";
import type { SublayState } from "../../store/sublayReducers";
import {
  upsertAccount,
  selectAccountMapSnapshot,
} from "../../store/slices/accountsSlice";
import { persistAccountMapFor } from "../../config/accountStorage";
import { readJwtExp } from "../../utils/jwt";

export type GetSublayState = () => { sublay: SublayState };

export interface MintAccountAccessTokenArgs {
  dispatch: AppDispatch;
  getState: GetSublayState;
  projectId: string;
  /** The stored, non-active account to mint for. */
  userId: string;
}

/** Raised when a mint cannot be completed. Never carries the token itself. */
export class AccountTokenMintError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccountTokenMintError";
  }
}

/** One in-flight exchange per `${projectId}:${userId}`. */
const inFlight = new Map<string, Promise<string>>();

/** Test seam — the map above is module state shared across a whole run. */
export function resetAccountTokenMints(): void {
  inFlight.clear();
}

export function mintAccountAccessToken({
  dispatch,
  getState,
  projectId,
  userId,
}: MintAccountAccessTokenArgs): Promise<string> {
  const key = `${projectId}:${userId}`;

  const existing = inFlight.get(key);
  if (existing) return existing;

  const run = exchange({ dispatch, getState, projectId, userId }).finally(
    () => {
      inFlight.delete(key);
    }
  );

  inFlight.set(key, run);
  return run;
}

async function exchange({
  dispatch,
  getState,
  projectId,
  userId,
}: MintAccountAccessTokenArgs): Promise<string> {
  const entry = getState().sublay.accounts.accounts[userId];

  if (!entry?.refreshToken) {
    throw new AccountTokenMintError(
      `No stored refresh token for account ${userId}.`
    );
  }

  const response = await axios.post(
    `/${projectId}/auth/request-new-access-token`,
    { refreshToken: entry.refreshToken }
  );

  const accessToken: string | undefined = response.data?.accessToken;
  const successor: string | undefined = response.data?.refreshToken;

  if (successor && successor !== entry.refreshToken) {
    // In-memory first, so the revoked token stops being the one anything else
    // would present even if the write below fails.
    dispatch(
      upsertAccount({
        userId,
        entry: {
          refreshToken: successor,
          tokenExpiresAt: readJwtExp(successor) ?? 0,
          // `upsertAccount` merges, so this preserves `pushEnabled` and every
          // other client-owned field; the summary is carried forward verbatim
          // because this exchange learns nothing new about the user.
          user: entry.user,
        },
      })
    );

    // AWAITED — rule 1 in the header. `persistAccountMapFor` goes through the
    // per-project mutex, so this cannot interleave with Phase C's own write.
    //
    // The `For` variant, not the bare one: the storage slot is last-mount-wins
    // across the whole process, so with two providers mounted for two different
    // projects the bare version would write this successor under the OTHER
    // project's key and resolve happily — reporting a completed mint while a
    // server-revoked token stays live on disk. It refuses instead.
    //
    // A rejection here means the successor is in memory but not on disk. That
    // is reported to the caller rather than swallowed: treating an unpersisted
    // rotation as a completed mint is precisely how an interrupted operation
    // ends up presenting a revoked token later. The state dispatch above still
    // stands, so Phase C's own persist gets a second, unawaited attempt.
    try {
      await persistAccountMapFor(projectId, selectAccountMapSnapshot(getState()));
    } catch (error) {
      throw new AccountTokenMintError(
        `Rotated the refresh token for account ${userId} but could not persist it: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  if (!accessToken) {
    throw new AccountTokenMintError(
      `The token exchange for account ${userId} returned no access token.`
    );
  }

  return accessToken;
}
