import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { SublayState } from "../sublayReducers";

// Types

export interface AccountSummary {
  id: string;
  name: string | null;
  email: string | null;
  avatar: string | null;
}

export interface AccountEntry {
  refreshToken: string;
  tokenExpiresAt: number; // epoch ms — extracted from JWT exp claim
  user: AccountSummary;
}

export interface AccountMap {
  activeAccountId: string | null;
  accounts: Record<string, AccountEntry>;
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
   */
  accountLimitReached: boolean;
  isReady: boolean;
  accountManagerRegistered: boolean;
}

export const MAX_ACCOUNTS = 5;

// Slice

const initialState: AccountsState = {
  accounts: {},
  activeAccountId: null,
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
    },
    upsertAccount: (
      state,
      action: PayloadAction<{ userId: string; entry: AccountEntry }>
    ) => {
      const isNewAccount = !(action.payload.userId in state.accounts);
      if (isNewAccount && Object.keys(state.accounts).length >= MAX_ACCOUNTS) {
        // Limit reached — the account is not admitted. Recorded rather than
        // silently ignored so `useAddAccount`/`useAccounts` can surface it.
        state.accountLimitReached = true;
        return;
      }
      state.accounts[action.payload.userId] = action.payload.entry;
      state.accountLimitReached = false;
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
      if (action.payload) state.signedOut = false;
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
  removeAccount,
  setActiveAccount,
  setSignedOut,
  setAccountLimitReached,
  clearAllAccounts,
  setAccountsReady,
  registerAccountManager,
} = accountsSlice.actions;

// Selectors — namespaced for dual-mode support
export const selectAccounts = (state: { sublay: SublayState }) =>
  state.sublay.accounts.accounts;
export const selectActiveAccountId = (state: { sublay: SublayState }) =>
  state.sublay.accounts.activeAccountId;
export const selectSignedOut = (state: { sublay: SublayState }) =>
  state.sublay.accounts.signedOut;
export const selectAccountLimitReached = (state: { sublay: SublayState }) =>
  state.sublay.accounts.accountLimitReached;
export const selectAccountsReady = (state: { sublay: SublayState }) =>
  state.sublay.accounts.isReady;
export const selectAccountManagerRegistered = (state: { sublay: SublayState }) =>
  state.sublay.accounts.accountManagerRegistered;

export default accountsSlice.reducer;
