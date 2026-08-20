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
} from "./accountsSlice";
import { baseApi } from "../api/baseApi";
import { resetAccountScopedState } from "../actions";
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
    { dispatch, rejectWithValue }
  ) => {
    try {
      dispatch(setAuthenticating(true));

      const result = await authService.signUpWithEmailAndPassword(
        data.projectId,
        data
      );

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
    { dispatch, rejectWithValue }
  ) => {
    try {
      dispatch(setAuthenticating(true));

      const result = await authService.signInWithEmailAndPassword(
        data.projectId,
        data
      );

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
    { dispatch, rejectWithValue }
  ) => {
    try {
      const result = await authService.verifyExternalUser(
        data.projectId,
        data.userJwt
      );

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
