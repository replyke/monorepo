import { createAction } from "@reduxjs/toolkit";

/**
 * Cross-slice actions — actions no single slice owns.
 *
 * They live outside `slices/` on purpose: every feature slice subscribes to
 * `resetAccountScopedState` through `extraReducers`, so defining it in a slice
 * would make that slice an import target of every other one.
 */

/**
 * "The account this state belonged to is no longer the active account."
 *
 * Dispatched by every account-changing path — `useSwitchAccount` (via the
 * transition core), `useRemoveAccount`, `signOutThunk`,
 * `confirmAccountDeletionThunk`, `signOutAllThunk`, `useAddAccount`, and both
 * `useAccountSync` paths that change the active account (Phase B's direct
 * sign-in and Phase D's cross-tab sync).
 *
 * Every hand-rolled feature slice handles it by returning to its initial state.
 * RTK-Query's cache is NOT covered by it — that is `baseApi.util.resetApiState()`,
 * dispatched alongside.
 *
 * Exported publicly so integrators who mount their own slices next to Sublay's
 * can subscribe to the same signal instead of re-deriving when an account
 * changed.
 */
export const resetAccountScopedState = createAction(
  "sublay/resetAccountScopedState"
);
