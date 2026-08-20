import { createAsyncThunk } from "@reduxjs/toolkit";
import axios from "../../config/axios";
import { getAuthorizedTokenForAccount } from "../../config/authGate";

import { handleError } from "../../utils/handleError";
import type { RootState } from "../index";
import {
  setTokens,
  setUser,
  setAuthenticating,
  setInitialized,
  resetAuth,
} from "./authSlice";
import {
  setUser as setUserInUserSlice,
  clearUser as clearUserInUserSlice,
} from "./userSlice";
import {
  removeAccount,
  clearAllAccounts,
  setActiveAccount,
  setSignedOut,
  setAccountLimitReached,
  wouldExceedAccountLimit,
  MAX_ACCOUNTS,
} from "./accountsSlice";
import { baseApi } from "../api/baseApi";
import { resetAccountScopedState } from "../actions";
import { readJwtSub } from "../../utils/jwt";
import type { PushDeviceIdentifier } from "../../interfaces/PushTokenAdapter";

// Account-management endpoints (change/set password, confirm account deletion)
// run behind requireUserAuth on the server. The shared default axios instance
// carries no token — only axiosPrivate (via useAxiosPrivate) and the RTK baseApi
// attach the bearer — so these thunk-driven calls must attach it explicitly.
//
// The token comes from the auth gate rather than from the Redux value the thunk
// read, which buys these calls the two guarantees every gated caller already
// has (see config/authGate.ts):
//
//   - COLD START. The gate holds the request until the auth bootstrap settles.
//     Without it a screen mounted before the bootstrap resolved posts with no
//     Authorization header at all and takes a bare 401 — reachable today via a
//     deletion-code deep link that cold-boots the app onto the confirm screen.
//   - IDLE EXPIRY. Access tokens live 30 minutes; the gate rotates one at or
//     near `exp` before it goes out. Without it a settings screen opened after
//     an idle stretch posts an expired token and takes a bare 403.
//
// What these calls still lack is the reactive 401/403 refresh-and-retry, which
// lives on axiosPrivate's response interceptor. A token the gate could not
// rotate pre-emptively — clock skew latches `clockUnreliable`, a prior rotation
// latched `rotationFailedFor`, or the server revoked it — still fails hard here
// with no second attempt. Closing that gap means registering those interceptors
// at the provider level so a thunk can post through axiosPrivate safely.
//
// Two things follow from resolving the token here rather than reading it:
//
//   - Callers must await this BEFORE deciding whether anyone is signed in. On a
//     cold start `auth.user` is still null while the bootstrap is in flight, so
//     checking first rejects a request about to become perfectly valid.
//   - The `ForAccount` variant, because these are WRITES. A request parked at
//     the gate across an account switch would otherwise resume and set a
//     password on an account the caller never chose.
type AuthorizedConfig =
  | { headers: { Authorization: string } }
  | undefined;

const withAuth = async (
  accessToken: string | null
): Promise<AuthorizedConfig> => {
  const token = await getAuthorizedTokenForAccount(accessToken);
  return token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
};

// Auth service functions - calling existing API patterns directly
const authService = {
  async signUpWithEmailAndPassword(
    projectId: string,
    data: {
      email: string;
      password: string;
      name?: string;
      username?: string;
      avatar?: string;
      bio?: string;
      location?: { latitude: number; longitude: number };
      birthdate?: Date;
      metadata?: Record<string, any>;
      secureMetadata?: Record<string, any>;
      avatarFile?: File | Blob;
      avatarOptions?: any;
      bannerFile?: File | Blob;
      bannerOptions?: any;
    }
  ) {
    // Check if we need to use FormData (when files are present)
    if (data.avatarFile || data.bannerFile) {
      const formData = new FormData();

      // Append regular fields
      formData.append("email", data.email);
      formData.append("password", data.password);
      if (data.name?.trim()) formData.append("name", data.name.trim());
      if (data.username?.trim()) formData.append("username", data.username.trim());
      if (data.bio?.trim()) formData.append("bio", data.bio.trim());
      if (data.location) formData.append("location", JSON.stringify(data.location));
      if (data.birthdate) formData.append("birthdate", data.birthdate.toISOString());
      if (data.metadata) formData.append("metadata", JSON.stringify(data.metadata));
      if (data.secureMetadata) formData.append("secureMetadata", JSON.stringify(data.secureMetadata));

      // Append avatar file and options
      if (data.avatarFile) {
        formData.append("avatarFile", data.avatarFile);
        if (data.avatarOptions) {
          formData.append("avatarFile.options", JSON.stringify(data.avatarOptions));
        }
      }

      // Append banner file and options
      if (data.bannerFile) {
        formData.append("bannerFile", data.bannerFile);
        if (data.bannerOptions) {
          formData.append("bannerFile.options", JSON.stringify(data.bannerOptions));
        }
      }

      const response = await axios.post(
        `/${projectId}/auth/sign-up`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      return response.data;
    }

    // Fallback to regular JSON request (backward compatibility)
    const response = await axios.post(
      `/${projectId}/auth/sign-up`,
      {
        email: data.email,
        password: data.password,
        name: data.name?.trim(),
        username: data.username?.trim(),
        avatar: data.avatar,
        bio: data.bio?.trim(),
        location: data.location,
        birthdate: data.birthdate,
        metadata: data.metadata,
        secureMetadata: data.secureMetadata,
      },
    );

    return response.data;
  },

  async signInWithEmailAndPassword(
    projectId: string,
    data: { email: string; password: string }
  ) {
    const response = await axios.post(`/${projectId}/auth/sign-in`, data);

    return response.data;
  },

  // `device` is OPTIONAL and nested under its own key, mirroring the server
  // schema exactly. When present (and the project has the `push` bundle) the
  // server deletes that user's push binding in the SAME transaction as the
  // token-family destroy: signing out unbinds push, or nothing happens at all
  // and the call fails so the caller can retry. Omitting it produces a request
  // byte-identical to the pre-existing one.
  async signOut(
    projectId: string,
    refreshToken: string | null,
    device?: PushDeviceIdentifier | null
  ) {
    const payload: Record<string, unknown> = refreshToken
      ? { refreshToken }
      : {};
    if (device) payload.device = device;
    await axios.post(`/${projectId}/auth/sign-out`, payload);
  },

  async requestNewAccessToken(projectId: string, refreshToken: string | null) {
    const payload = refreshToken ? { refreshToken } : {};
    const response = await axios.post(
      `/${projectId}/auth/request-new-access-token`,
      payload
    );

    return response.data;
  },

  async verifyExternalUser(projectId: string, userJwt: string) {
    const response = await axios.post(
      `/${projectId}/auth/verify-external-user`,
      { userJwt }
    );

    return response.data;
  },

  async changePassword(
    projectId: string,
    data: { password: string; newPassword: string },
    authorization: AuthorizedConfig
  ) {
    await axios.post(`/${projectId}/auth/change-password`, data, authorization);
  },

  async setPassword(
    projectId: string,
    data: { newPassword: string },
    authorization: AuthorizedConfig
  ) {
    await axios.post(`/${projectId}/auth/set-password`, data, authorization);
  },

  async confirmAccountDeletion(
    projectId: string,
    code: string,
    authorization: AuthorizedConfig
  ) {
    await axios.post(
      `/${projectId}/auth/confirm-account-deletion`,
      { code },
      authorization
    );
  },
};

// ── The account cap: two gates ───────────────────────────────────────────────
//
// Reaching `MAX_ACCOUNTS` used to produce a corrupted map rather than an error:
// `upsertAccount` silently refused the entry and `useAccountSync` activated the
// id anyway, leaving `activeAccountId` naming an account that is not in
// `accounts` — persisted, and restored on the next launch.
//
// GATE 1 — pre-flight, before any network call, **sign-up only.** A sign-up
// creates a person who by definition is not in the map, so a full map rejects
// unconditionally, with certainty and no round trip.
//
// **Email sign-in deliberately gets no pre-flight.** A Gate-1 rejection is
// terminal: it happens before the network, so identity is never resolved and
// Gate 2 never runs to correct it. Matching the typed email against stored
// summaries would lock a legitimate user out of their own account whenever the
// stored email is stale, absent (accounts admitted through `verifyExternalUser`
// carry a null email), or cased differently from what they typed — the server
// canonicalizes, the client would compare raw input. OAuth and
// `verifyExternalUser` have no pre-flight either: identity exists only after
// the provider or the server resolves it.
//
// GATE 2 — post-authentication, authoritative, on ALL FOUR entry points:
// `signUpWithEmailAndPasswordThunk`, `signInWithEmailAndPasswordThunk`,
// `verifyExternalUserThunk`, and the OAuth path (`completeOAuthSignInThunk`,
// dispatched by `oauthCore`'s `handleOAuthRedirect`, which never goes through
// the sign-in thunks). Once the real `user.id` is known: if it is new and the
// map is full, sign the just-minted session out server-side, restore what can
// be restored, set the flag, and reject.
//
// The three thunk entry points run Gate 2 **before** their `setTokens`/`setUser`
// rather than unwinding them afterwards, which is why they need no local
// teardown: the previous account's session is never touched. The OAuth path
// cannot — `handleOAuthRedirect` writes the tokens synchronously, before any
// identity exists — so it is the one path that unwinds, and its unwind restores
// SELECTION ONLY (see `unwindLocalSession` below).

/**
 * The dispatch shape the cap helper needs.
 *
 * Deliberately structural rather than `AppDispatch`: `createAsyncThunk` hands
 * its body a `ThunkDispatch` parameterised on `unknown` state, which is not
 * assignable to the store's own dispatch type.
 */
type CapGateDispatch = (action: any) => any;

export const ACCOUNT_LIMIT_MESSAGE = `This device is already signed in to ${MAX_ACCOUNTS} accounts, the maximum. Sign out of one of them before signing in to another.`;

/**
 * Turns a session that cannot be admitted into a clean refusal.
 *
 * Three obligations, in this order:
 *
 *  1. **Sign the just-minted session out server-side.** Gate 2 runs after
 *     authentication, so a real token family exists on the server for an
 *     account this device is about to forget. Without this call it would sit
 *     there until expiry with nothing able to reach it — `refreshToken` must
 *     therefore be the credential CAPTURED BEFORE anything overwrote it (the
 *     value straight off the auth response on the thunk paths; the rotated
 *     successor read out of state on the OAuth path, since the redirect's
 *     original was already spent by the refresh).
 *
 *     No `device` is sent. The device identifier would ask the server to unbind
 *     push in the same transaction, and per the atomicity rule a failed unbind
 *     fails the whole request — which would leave the very session this call
 *     exists to destroy alive. An account that was never admitted has no
 *     binding this SDK created on this device anyway.
 *
 *  2. **Unwind local session state, but only where the caller already wrote
 *     it.** Selection is restored; the session is not re-established (the same
 *     honesty as the transition core's rollback — by this point the previous
 *     account's access token is gone and recovering it would mean spending its
 *     refresh token on another call that can fail in turn).
 *
 *  3. **Set the limit flag**, which is the ONLY channel the OAuth paths have:
 *     `handleOAuthRedirect` is synchronous and shared by web and Expo, so
 *     neither can reject its caller.
 */
async function refuseAtAccountLimit({
  dispatch,
  projectId,
  refreshToken,
  unwindLocalSession = false,
  previousActiveAccountId = null,
}: {
  dispatch: CapGateDispatch;
  projectId: string;
  /** The credential of the session being refused, captured before any rewrite. */
  refreshToken: string | null | undefined;
  /** True only for callers that already wrote tokens/user into Redux. */
  unwindLocalSession?: boolean;
  previousActiveAccountId?: string | null;
}): Promise<void> {
  if (refreshToken) {
    try {
      await authService.signOut(projectId, refreshToken);
    } catch (error) {
      // Logged, not rethrown: the caller's error is the account limit, and a
      // failed cleanup must not replace it with a confusing transport error.
      // Nothing is leaked to the user either way — the credential is discarded
      // here and never persisted, so the stranded family is unreachable rather
      // than usable.
      handleError(
        error,
        "Failed to sign out the session refused at the account limit:"
      );
    }
  }

  if (unwindLocalSession) {
    dispatch(resetAuth());
    dispatch(clearUserInUserSlice());
    dispatch(baseApi.util.resetApiState());
    dispatch(resetAccountScopedState());
    // Selection only. `setActiveAccount(null)` deliberately does NOT set
    // `signedOut`: the user did not sign out, they failed to ADD an account, so
    // the next launch should behave exactly as it would have before the attempt
    // (Phase A's first-account fallback) rather than parking them at the picker.
    dispatch(setActiveAccount(previousActiveAccountId ?? null));
  }

  dispatch(setAccountLimitReached(true));
}

// Async Thunks

export const signUpWithEmailAndPasswordThunk = createAsyncThunk(
  "auth/signUpWithEmailAndPassword",
  async (
    data: {
      projectId: string;
      email: string;
      password: string;
      name?: string;
      username?: string;
      avatar?: string;
      bio?: string;
      location?: { latitude: number; longitude: number };
      birthdate?: Date;
      metadata?: Record<string, any>;
      secureMetadata?: Record<string, any>;
      avatarFile?: File | Blob;
      avatarOptions?: any;
      bannerFile?: File | Blob;
      bannerOptions?: any;
    },
    { dispatch, getState, rejectWithValue }
  ) => {
    try {
      dispatch(setAuthenticating(true));

      // GATE 1 — pre-flight, sign-up only. No network call is made at all: a
      // sign-up admits a new person by definition, so a full map is a certain
      // refusal with no false-rejection risk.
      const accountsBefore = (getState() as RootState).sublay.accounts.accounts;
      if (wouldExceedAccountLimit(accountsBefore)) {
        dispatch(setAccountLimitReached(true));
        return rejectWithValue(ACCOUNT_LIMIT_MESSAGE);
      }

      const result = await authService.signUpWithEmailAndPassword(
        data.projectId,
        data
      );

      // GATE 2 — authoritative, and still needed after Gate 1: the map can fill
      // while the request is in flight (another tab, a concurrent sign-in).
      // Runs BEFORE the dispatches below, so there is nothing to unwind and the
      // account that was active — if any — keeps its session.
      if (
        wouldExceedAccountLimit(
          (getState() as RootState).sublay.accounts.accounts,
          result?.user?.id
        )
      ) {
        await refuseAtAccountLimit({
          dispatch,
          projectId: data.projectId,
          // Captured straight off the response, before anything can overwrite it.
          refreshToken: result?.refreshToken,
        });
        return rejectWithValue(ACCOUNT_LIMIT_MESSAGE);
      }

      // Update auth state
      dispatch(
        setTokens({
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        })
      );
      dispatch(setUser(result.user));
      dispatch(setUserInUserSlice(result.user)); // Sync user to user slice

      return result;
    } catch (error) {
      handleError(error, "Failed to register user with email and password:");
      return rejectWithValue(
        error instanceof Error ? error.message : "Unknown error"
      );
    } finally {
      dispatch(setAuthenticating(false));
    }
  }
);

export const signInWithEmailAndPasswordThunk = createAsyncThunk(
  "auth/signInWithEmailAndPassword",
  async (
    data: { projectId: string; email: string; password: string },
    { dispatch, getState, rejectWithValue }
  ) => {
    try {
      dispatch(setAuthenticating(true));

      // NO Gate 1 here — see the two-gate note above. Signing back in to an
      // account this device already stores must work at the cap, and only the
      // server can say which account the credentials belong to.
      const result = await authService.signInWithEmailAndPassword(
        data.projectId,
        data
      );

      // GATE 2 — keyed on the resolved id, so an already-stored account (one
      // with a stale, absent or differently-cased stored email included) passes
      // straight through. Runs BEFORE the dispatches below: nothing to unwind,
      // and the currently active account keeps its session.
      if (
        wouldExceedAccountLimit(
          (getState() as RootState).sublay.accounts.accounts,
          result?.user?.id
        )
      ) {
        await refuseAtAccountLimit({
          dispatch,
          projectId: data.projectId,
          refreshToken: result?.refreshToken,
        });
        return rejectWithValue(ACCOUNT_LIMIT_MESSAGE);
      }

      // Update auth state
      dispatch(
        setTokens({
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        })
      );
      dispatch(setUser(result.user));
      dispatch(setUserInUserSlice(result.user)); // Sync user to user slice

      return result;
    } catch (error) {
      handleError(error, "Failed to log user in:");
      return rejectWithValue(
        error instanceof Error ? error.message : "Unknown error"
      );
    } finally {
      dispatch(setAuthenticating(false));
    }
  }
);

export const signOutThunk = createAsyncThunk(
  "auth/signOut",
  async (
    data: { projectId: string },
    { dispatch, getState, rejectWithValue }
  ) => {
    const state = getState() as RootState;
    const refreshToken = state.sublay.auth.refreshToken;
    const activeAccountId = state.sublay.accounts.activeAccountId;
    // Read synchronously from the slice — this is the reason the device
    // identifier has a Redux home rather than living only in storage: none of
    // the sign-out callers can reach `AccountStorage`.
    const device = state.sublay.accounts.deviceIdentifier;

    if (!refreshToken) {
      throw new Error("No refresh token");
    }

    try {
      dispatch(setAuthenticating(true));

      // If this throws, NOTHING below runs: the account keeps its entry and its
      // credential so the user can retry. That is the client half of the
      // atomicity guarantee — without it the server can honestly refuse the
      // unbind and the SDK deletes the credential anyway, leaving the user
      // receiving notifications from an account they can no longer reach.
      await authService.signOut(data.projectId, refreshToken, device);

      // Remove current account from the multi-account map. The reducer leaves
      // NO account active — see below.
      if (activeAccountId) {
        dispatch(removeAccount(activeAccountId));
      }

      // Signing out ends the session. It does NOT sign you into whichever
      // account happens to be left: picking the next identity is the app's
      // decision. (This used to activate `remaining[0]` — insertion order, so
      // the oldest account ever added — and refresh into it.)
      dispatch(resetAuth());
      dispatch(clearUserInUserSlice());
      dispatch(baseApi.util.resetApiState());
      dispatch(resetAccountScopedState());
      // Belt and braces: `removeAccount` already sets this when the removed
      // account was the active one, but a sign-out with no active account in
      // the map still has to read as deliberate on the next launch.
      dispatch(setSignedOut(true));

      return;
    } catch (error) {
      handleError(error, "Failed to log user out:");
      return rejectWithValue(
        error instanceof Error ? error.message : "Unknown error"
      );
    } finally {
      dispatch(setAuthenticating(false));
    }
  }
);

export const confirmAccountDeletionThunk = createAsyncThunk(
  "auth/confirmAccountDeletion",
  async (
    data: { projectId: string; code: string },
    { dispatch, getState, rejectWithValue }
  ) => {
    const state = getState() as RootState;
    const activeAccountId = state.sublay.accounts.activeAccountId;

    try {
      dispatch(setAuthenticating(true));

      // Permanently delete the account on the server (verifies the emailed
      // code). The user's tokens are destroyed as part of the cascade.
      await authService.confirmAccountDeletion(
        data.projectId,
        data.code,
        await withAuth(state.sublay.auth.accessToken)
      );

      // Tear down the local session exactly like sign-out: drop the deleted
      // account from the multi-account map and land signed-out. No server
      // sign-out call — the session is already gone. No successor account is
      // activated (see `signOutThunk`).
      if (activeAccountId) {
        dispatch(removeAccount(activeAccountId));
      }

      dispatch(resetAuth());
      dispatch(clearUserInUserSlice());
      dispatch(baseApi.util.resetApiState());
      dispatch(resetAccountScopedState());
      dispatch(setSignedOut(true));

      return;
    } catch (error) {
      handleError(error, "Failed to delete account:");
      return rejectWithValue(
        error instanceof Error ? error.message : "Unknown error"
      );
    } finally {
      dispatch(setAuthenticating(false));
    }
  }
);

export const requestNewAccessTokenThunk = createAsyncThunk(
  "auth/requestNewAccessToken",
  async (
    data: { projectId: string },
    { dispatch, getState, rejectWithValue }
  ) => {
    const state = getState() as RootState;
    const refreshToken = state.sublay.auth.refreshToken;

    if (!refreshToken) {
      // REJECT rather than fulfil-with-undefined.
      //
      // This early return used to *fulfil*, which made every caller that
      // guarded on `fulfilled.match(result)` treat "there is no credential to
      // refresh with" as a successful refresh. An account entry with an empty
      // or missing refresh token therefore switched cleanly into a session
      // that did not exist. Rejecting here is what lets the unwrap guards
      // downstream be trustworthy.
      //
      // Public breaking change: `requestNewAccessTokenThunk` is exported, and
      // an integrator branching on `fulfilled.match` for the no-token case
      // sees the opposite branch now.
      return rejectWithValue("No refresh token available");
    }

    try {
      const result = await authService.requestNewAccessToken(
        data.projectId,
        refreshToken
      );

      // Update auth state (store rotated refresh token from server)
      dispatch(setTokens({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      }));
      dispatch(setUser(result.user));
      dispatch(setUserInUserSlice(result.user)); // Sync user to user slice

      return result.accessToken;
    } catch (error) {
      handleError(error, "Request new access token error:");
      return rejectWithValue(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
);

export const verifyExternalUserThunk = createAsyncThunk(
  "auth/verifyExternalUser",
  async (
    data: { projectId: string; userJwt: string },
    { dispatch, getState, rejectWithValue }
  ) => {
    try {
      const result = await authService.verifyExternalUser(
        data.projectId,
        data.userJwt
      );

      // GATE 2. No pre-flight is possible: the identity inside the signed token
      // is the server's to resolve, not the client's. Runs before the state
      // writes below, so a refusal leaves whatever session was live untouched.
      //
      // `initializeAuthThunk` calls this thunk on every launch in integration
      // mode and must not swallow this particular rejection — see the cap-limit
      // branch there.
      if (
        wouldExceedAccountLimit(
          (getState() as RootState).sublay.accounts.accounts,
          result?.user?.id
        )
      ) {
        await refuseAtAccountLimit({
          dispatch,
          projectId: data.projectId,
          refreshToken: result?.refreshToken,
        });
        return rejectWithValue(ACCOUNT_LIMIT_MESSAGE);
      }

      // Update auth state
      dispatch(
        setTokens({
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        })
      );
      dispatch(setUser(result.user));
      dispatch(setUserInUserSlice(result.user)); // Sync user to user slice

      return result;
    } catch (error) {
      handleError(error, "Verify external user error:");
      return rejectWithValue(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
);

/**
 * The OAuth tail: fetch the profile for the tokens the redirect carried, then
 * apply Gate 2 to the identity that comes back.
 *
 * **The fourth entry point, and the one most easily missed.** OAuth never goes
 * through the sign-in thunks: `oauthCore`'s `handleOAuthRedirect` drives
 * `setTokens` → `setInitialized` → the refresh itself. A cap guard placed only
 * on the sign-in thunks would leave the single path that also has no pre-flight
 * completely uncovered, which is the exact shape that corrupted the map.
 *
 * **It does not reject its caller, by design.** `handleOAuthRedirect` is
 * synchronous, shared by `@sublay/react-js` and `@sublay/expo`, and returns
 * `{ success: true }` before any identity exists; on web the flow is a full-page
 * navigation, so the promise from `initiateOAuth` belongs to a document that no
 * longer exists by the time the callback runs. Making either platform reject
 * would mean making that exported function async and changing the Expo hook's
 * error convention from state to throw. Decided: don't. **Both OAuth paths
 * surface the cap through `accountLimitReached`** — that is why the flag exists
 * alongside the thrown errors, and the asymmetry is documented.
 *
 * This is also the one Gate-2 site that must UNWIND rather than run first: the
 * tokens were written before the identity was knowable.
 */
export const completeOAuthSignInThunk = createAsyncThunk(
  "auth/completeOAuthSignIn",
  async (data: { projectId: string }, { dispatch, getState }) => {
    const previousActiveAccountId = (getState() as RootState).sublay.accounts
      .activeAccountId;

    const result = await dispatch(
      requestNewAccessTokenThunk({ projectId: data.projectId })
    );

    // A failed refresh is already handled (and logged) by that thunk; there is
    // no identity to gate on, and nothing was admitted.
    if (
      !requestNewAccessTokenThunk.fulfilled.match(result) ||
      !result.payload
    ) {
      return;
    }

    const state = getState() as RootState;
    // The refresh ROTATED: the credential in state now is the live one, and the
    // token the redirect carried is already spent. This is the value that must
    // be captured before the unwind below clears it.
    const mintedRefreshToken = state.sublay.auth.refreshToken;
    // The profile fetch populates `user`; the refresh token's `sub` is the same
    // id, and covers a response that carried tokens but no user object.
    const userId = state.sublay.auth.user?.id ?? readJwtSub(mintedRefreshToken);

    if (!userId) return;
    if (!wouldExceedAccountLimit(state.sublay.accounts.accounts, userId)) return;

    await refuseAtAccountLimit({
      dispatch,
      projectId: data.projectId,
      refreshToken: mintedRefreshToken,
      unwindLocalSession: true,
      previousActiveAccountId,
    });
  }
);

export const changePasswordThunk = createAsyncThunk(
  "auth/changePassword",
  async (
    data: { projectId: string; password: string; newPassword: string },
    { dispatch, getState, rejectWithValue }
  ) => {
    const state = getState() as RootState;

    try {
      dispatch(setAuthenticating(true));

      // Gate first, signed-in check second — see `withAuth`. Rejected via
      // `rejectWithValue` rather than a bare throw so the message survives as
      // `action.payload`, which is what `useAuth` rethrows to the caller.
      const authorization = await withAuth(state.sublay.auth.accessToken);

      // Re-read: the bootstrap we just waited on is what populates `user`.
      if (!(getState() as RootState).sublay.auth.user) {
        return rejectWithValue("No user is authenticated");
      }

      await authService.changePassword(data.projectId, data, authorization);

      return;
    } catch (error) {
      handleError(error, "Failed to change password:");
      return rejectWithValue(
        error instanceof Error ? error.message : "Unknown error"
      );
    } finally {
      dispatch(setAuthenticating(false));
    }
  }
);

export const setPasswordThunk = createAsyncThunk(
  "auth/setPassword",
  async (
    data: { projectId: string; newPassword: string },
    { dispatch, getState, rejectWithValue }
  ) => {
    const state = getState() as RootState;

    try {
      dispatch(setAuthenticating(true));

      // Same ordering as changePasswordThunk above.
      const authorization = await withAuth(state.sublay.auth.accessToken);

      if (!(getState() as RootState).sublay.auth.user) {
        return rejectWithValue("No user is authenticated");
      }

      await authService.setPassword(data.projectId, data, authorization);

      return;
    } catch (error) {
      handleError(error, "Failed to set password:");
      return rejectWithValue(
        error instanceof Error ? error.message : "Unknown error"
      );
    } finally {
      dispatch(setAuthenticating(false));
    }
  }
);

export const signOutAllThunk = createAsyncThunk(
  "auth/signOutAll",
  async (
    data: { projectId: string },
    { dispatch, getState, rejectWithValue }
  ) => {
    const state = getState() as RootState;
    const accounts = state.sublay.accounts.accounts;
    const device = state.sublay.accounts.deviceIdentifier;

    try {
      dispatch(setAuthenticating(true));

      // Per account. Whether a failure is fatal depends on whether an UNBIND
      // was actually attempted — see `strict` below.
      const outcomes = await Promise.all(
        Object.entries(accounts).map(async ([userId, account]) => {
          try {
            await authService.signOut(
              data.projectId,
              account.refreshToken,
              device
            );
            return { userId, ok: true as const };
          } catch (err) {
            handleError(err, `Failed to sign out account on server:`);
            return { userId, ok: false as const, error: err };
          }
        })
      );

      const failed = outcomes.filter((outcome) => !outcome.ok);

      // ── The strictness is SCOPED TO UNBIND FAILURES. ─────────────────────
      //
      // A request carrying a `device` is relying on the atomic guarantee: the
      // server removed the push binding and the token family together or
      // removed neither. Swallowing that failure and clearing the map anyway —
      // which is what this loop used to do for every failure — deletes the
      // credential for an account whose binding survived, leaving the user
      // receiving notifications from it with nothing left able to stop them.
      //
      // Without a device there is no unbind to protect, and the old
      // best-effort behaviour is kept ON PURPOSE. `/auth/sign-out` returns 204
      // for every write and token failure when no device is sent, so the only
      // remaining failure is the TRANSPORT: strictness here would stop an
      // offline user — or any app on a project without the `push` bundle —
      // from signing out locally at all, against the server's own rule that a
      // user can ALWAYS sign out.
      const strict = Boolean(device);
      const blocked = strict && failed.length > 0;

      if (!blocked) {
        dispatch(clearAllAccounts());
      } else {
        // Drop only what actually signed out; leave the rest to be retried.
        for (const outcome of outcomes) {
          if (outcome.ok) dispatch(removeAccount(outcome.userId));
        }
        // The user asked to sign out of everything, so the live session ends
        // either way — an access token is transient state, not the credential
        // the guarantee is about.
        dispatch(setActiveAccount(null));
        dispatch(setSignedOut(true));
      }

      dispatch(resetAuth());
      dispatch(clearUserInUserSlice());
      dispatch(baseApi.util.resetApiState());
      dispatch(resetAccountScopedState());

      if (blocked) {
        return rejectWithValue(
          `Failed to sign out ${failed.length} of ${outcomes.length} accounts. Their sessions are still active — retry.`
        );
      }

      return;
    } catch (error) {
      handleError(error, "Failed to sign out all accounts:");
      return rejectWithValue(
        error instanceof Error ? error.message : "Unknown error"
      );
    } finally {
      dispatch(setAuthenticating(false));
    }
  }
);

// Initialize auth - handles the startup flow
export const initializeAuthThunk = createAsyncThunk(
  "auth/initialize",
  async (
    data: { projectId: string; signedToken?: string | null },
    { dispatch, getState }
  ) => {
    try {
      // Step 1: If we have a signed token, verify external user.
      //
      // A FULFILLED verify has already established the session — it dispatched
      // `setTokens` (access AND refresh) plus `setUser` into both slices,
      // which is precisely what step 2 would do. So step 2 is redundant on
      // this path, and worse than redundant: the refresh exchange ROTATES,
      // spending a refresh token minted milliseconds ago for nothing.
      //
      // Returning here is also what keeps the failure branch below honest.
      // That branch discards the credential and lands signed-out, which is the
      // right answer for "a STORED token turned out to be dead" — the case the
      // decision was made for. It is the wrong answer for a session minted
      // seconds earlier: a single network blip in the ~100ms window between
      // verify and refresh would sign the user out of a perfectly good
      // session. Integration-mode apps feel that worst — they have no stored
      // accounts and no picker to recover through, and this thunk will not
      // re-run (its effect deps are unchanged and `initialized` latches), so
      // the app would sit signed-out until a reload.
      //
      // A REJECTED verify falls through: a stored account may still be
      // restorable, which is the behavior this path has always had.
      if (data.signedToken) {
        const verified = await dispatch(
          verifyExternalUserThunk({
            projectId: data.projectId,
            userJwt: data.signedToken,
          })
        );

        if (verifyExternalUserThunk.fulfilled.match(verified)) return;

        // ── Gate 2 × the launch path. ──────────────────────────────────────
        //
        // An integration-mode app with a full map booting as a NEW user gets
        // its just-minted session signed out by Gate 2 — correctly — and would
        // then fall through to step 2 and quietly restore whichever stored
        // account happens to be selected, as if the app's own signed token had
        // never been presented. Worse, with no stored account it would land
        // silently signed-out on EVERY launch, with no error and no route
        // through: the rejection has no call site to reach, because the app
        // never called anything.
        //
        // So this failure surfaces instead of being swallowed: throw into the
        // catch below, which lands observably signed-out and logs a reason,
        // while `accountLimitReached` (set by Gate 2 and cleared by nothing on
        // that path) stays true for the UI to read. `setInitialized(true)`
        // still runs in `finally` — see the note there.
        //
        // Discriminated on the REJECTION PAYLOAD, statelessly. Reading
        // `accountLimitReached` across the dispatch instead would be a sticky
        // latch: nothing ever sets it back to `false` (only a successful
        // admission or a removal clears it), and `SublayStoreProvider`
        // re-dispatches this thunk on EVERY `signedToken` change with no
        // `initialized` guard. So a user refused once, whose host app then
        // rotated its signed JWT, would re-enter here with the flag already
        // true, fail the "did it just flip?" test, and fall through to step 2 —
        // silently restoring the previous account. Exactly the swallow this
        // branch exists to prevent.
        //
        // Safe to key on the payload: `verifyExternalUserThunk` has no caller
        // outside this thunk and is not exported from `index.ts`, so nothing
        // downstream rethrows its payload as a user-facing message.
        if (verified.payload === ACCOUNT_LIMIT_MESSAGE) {
          throw new Error(ACCOUNT_LIMIT_MESSAGE);
        }
      }

      // Step 2: Try to refresh access token.
      //
      // No stored credential AND no account selected is not a failure — it is
      // a first launch, or a launch after a sign-out. Bail before the refresh
      // so the failure branch below means what it says. A selected account
      // with no usable credential IS a failure, and falls through to the
      // refresh (which now rejects for exactly that) so it lands observably.
      const bootState = getState() as RootState;
      if (
        !bootState.sublay.auth.refreshToken &&
        !bootState.sublay.accounts.activeAccountId
      ) {
        return;
      }

      const result = await dispatch(
        requestNewAccessTokenThunk({ projectId: data.projectId })
      );

      // This is the fifth unwrap site and the most consequential one. Until
      // now the `await`ed dispatch resolved even for a rejected thunk, so the
      // `catch` below was DEAD CODE for exactly the failure that matters: an
      // active account whose stored refresh token had expired reproduced the
      // stranded state on every single launch, unobserved.
      if (
        !requestNewAccessTokenThunk.fulfilled.match(result) ||
        !result.payload
      ) {
        throw new Error(
          (typeof result.payload === "string" && result.payload) ||
            "Could not restore the stored session."
        );
      }
    } catch (error) {
      handleError(error, "Auth initialization failed:");

      // Land signed-out with the account entries intact, exactly like a failed
      // remove/sign-out — one consistent answer to "a stored token turned out
      // to be dead". The user picks from the switcher; they are never silently
      // moved into an account they did not ask for. `signedOut` is what stops
      // Phase A re-activating the first stored account on the next launch.
      dispatch(resetAuth());
      dispatch(clearUserInUserSlice());
      dispatch(baseApi.util.resetApiState());
      dispatch(resetAccountScopedState());
      dispatch(setActiveAccount(null));
      dispatch(setSignedOut(true));

      // Rethrow so the reason is REACHABLE, not just logged. Swallowing left
      // it in a `console.error` that the log-level setter can silence, with no
      // way for an app to tell "you signed out" apart from "your stored
      // session expired" — both land on `signedOut: true`.
      //
      // Safe to throw: both providers dispatch this thunk bare, with no
      // `.unwrap()` and no `.catch()`, and nothing subscribes to it in
      // `extraReducers`. So it produces a rejected ACTION, never an unhandled
      // rejection, and the message surfaces as `action.error.message` for a
      // caller that wants it. The teardown above has already run, and
      // `setInitialized(true)` still runs in `finally` below.
      throw error;
    } finally {
      // ALWAYS — this is what opens the request-path auth gate. Withholding it
      // to "fail closed" would park every outbound request behind the 5s ready
      // timeout, silently, for the life of the session. See config/authGate.ts.
      dispatch(setInitialized(true));
    }
  }
);
