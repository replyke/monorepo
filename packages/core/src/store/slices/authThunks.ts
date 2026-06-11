import { createAsyncThunk } from "@reduxjs/toolkit";
import axios from "../../config/axios";

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
import { removeAccount, clearAllAccounts } from "./accountsSlice";
import { baseApi } from "../api/baseApi";

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

  async signOut(projectId: string, refreshToken: string | null) {
    const payload = refreshToken ? { refreshToken } : {};
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
    data: { password: string; newPassword: string }
  ) {
    await axios.post(`/${projectId}/auth/change-password`, data);
  },

  async confirmAccountDeletion(projectId: string, code: string) {
    await axios.post(`/${projectId}/auth/confirm-account-deletion`, { code });
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
    const accounts = state.sublay.accounts.accounts;

    if (!refreshToken) {
      throw new Error("No refresh token");
    }

    try {
      dispatch(setAuthenticating(true));

      await authService.signOut(data.projectId, refreshToken);

      // Remove current account from the multi-account map
      if (activeAccountId) {
        dispatch(removeAccount(activeAccountId));
      }

      // Check for remaining accounts
      const remainingIds = Object.keys(accounts).filter(
        (id) => id !== activeAccountId
      );

      if (remainingIds.length > 0) {
        // Switch to the first remaining account
        const nextId = remainingIds[0];
        const nextAccount = accounts[nextId];

        dispatch(resetAuth());
        dispatch(clearUserInUserSlice());
        dispatch(baseApi.util.resetApiState());
        dispatch(
          setTokens({
            accessToken: null,
            refreshToken: nextAccount.refreshToken,
          })
        );
        dispatch(setInitialized(false));

        await dispatch(
          requestNewAccessTokenThunk({ projectId: data.projectId })
        );
        dispatch(setInitialized(true));
      } else {
        // No remaining accounts — standard sign-out
        dispatch(resetAuth());
        dispatch(clearUserInUserSlice());
        dispatch(baseApi.util.resetApiState());
      }

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
    const accounts = state.sublay.accounts.accounts;

    try {
      dispatch(setAuthenticating(true));

      // Permanently delete the account on the server (verifies the emailed
      // code). The user's tokens are destroyed as part of the cascade.
      await authService.confirmAccountDeletion(data.projectId, data.code);

      // Tear down the local session exactly like sign-out: drop the deleted
      // account from the multi-account map, then either switch to a remaining
      // account or fully reset. No server sign-out call — the session is
      // already gone.
      if (activeAccountId) {
        dispatch(removeAccount(activeAccountId));
      }

      const remainingIds = Object.keys(accounts).filter(
        (id) => id !== activeAccountId
      );

      if (remainingIds.length > 0) {
        // Switch to the first remaining account
        const nextId = remainingIds[0];
        const nextAccount = accounts[nextId];

        dispatch(resetAuth());
        dispatch(clearUserInUserSlice());
        dispatch(baseApi.util.resetApiState());
        dispatch(
          setTokens({
            accessToken: null,
            refreshToken: nextAccount.refreshToken,
          })
        );
        dispatch(setInitialized(false));

        await dispatch(
          requestNewAccessTokenThunk({ projectId: data.projectId })
        );
        dispatch(setInitialized(true));
      } else {
        // No remaining accounts — standard teardown
        dispatch(resetAuth());
        dispatch(clearUserInUserSlice());
        dispatch(baseApi.util.resetApiState());
      }

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
      return;
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

    if (!state.sublay.auth.user) {
      throw new Error("No user is authenticated");
    }

    try {
      dispatch(setAuthenticating(true));

      await authService.changePassword(data.projectId, data);

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

export const signOutAllThunk = createAsyncThunk(
  "auth/signOutAll",
  async (
    data: { projectId: string },
    { dispatch, getState, rejectWithValue }
  ) => {
    const state = getState() as RootState;
    const accounts = state.sublay.accounts.accounts;

    try {
      dispatch(setAuthenticating(true));

      // Sign out from each account on the server (best-effort)
      const signOutPromises = Object.values(accounts).map(async (account) => {
        try {
          await authService.signOut(data.projectId, account.refreshToken);
        } catch (err) {
          // Best-effort: log but don't fail the entire operation
          handleError(err, `Failed to sign out account on server:`);
        }
      });

      await Promise.all(signOutPromises);

      // Clear all local state
      dispatch(clearAllAccounts());
      dispatch(resetAuth());
      dispatch(clearUserInUserSlice());
      dispatch(baseApi.util.resetApiState());

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
    { dispatch }
  ) => {
    try {
      // Step 1: If we have a signed token, verify external user
      if (data.signedToken) {
        await dispatch(
          verifyExternalUserThunk({
            projectId: data.projectId,
            userJwt: data.signedToken,
          })
        );
      }

      // Step 2: Try to refresh access token
      await dispatch(
        requestNewAccessTokenThunk({ projectId: data.projectId })
      );
    } catch (error) {
      handleError(error, "Auth initialization failed:");
    } finally {
      dispatch(setInitialized(true));
    }
  }
);
