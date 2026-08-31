import { useMemo } from "react";
import { useSublaySelector } from "../../store/hooks";
import {
  selectAccounts,
  selectActiveAccountId,
  selectAccountLimitReached,
  selectSignedOut,
  accountNeedsReauth,
  accountNeedsPushRebind,
  type AccountSummary,
} from "../../store/slices/accountsSlice";

/**
 * A stored account as a switcher needs to render it: the profile summary plus
 * the two markers that say whether its stored credential is still worth trying.
 *
 * A superset of `AccountSummary`, so existing code that reads `id`/`name`/
 * `email`/`avatar`/`username` off these is unaffected.
 */
export interface StoredAccount extends AccountSummary {
  /**
   * When this account's stored refresh token expires, as an epoch in
   * milliseconds, read from the token's own `exp` claim.
   *
   * **`0` means "unknown"** — the token carried no readable numeric `exp`, so
   * `useAccountSync` recorded 0 rather than guessing. It reads as
   * already-expired on purpose: treating a credential we cannot understand as
   * fresh is the failure mode worth avoiding.
   *
   * Proactive but not sufficient. It only knows what the JWT says, and a token
   * family can be killed while its `exp` is still far in the future — see
   * `needsReauth`.
   */
  tokenExpiresAt: number;
  /**
   * `true` when a switch into this account has actually been refused by the
   * server: revoked, reuse-detected, or invalidated by a password change, a
   * remote sign-out-all or an admin revocation. All of those leave `exp`
   * untouched, so this is the only way to see them.
   *
   * Reactive but not sufficient either — it is only ever set by *trying*.
   * Render a switcher off both: `needsReauth || tokenExpiresAt <= Date.now()`.
   *
   * Clears the moment the account is successfully activated, whether by a
   * switch or by signing into it again.
   */
  needsReauth: boolean;
  /**
   * `true` when this account's notifications are paused because this device's
   * push token changed while the account was in the background.
   *
   * Its stored credential is fine and its data is fine — only the server-side
   * notification binding points at a token this device no longer holds.
   * Switching into the account re-creates the binding and clears this, so the
   * useful thing to render is an invitation to open it: *"notifications paused
   * — open to resume"*.
   *
   * **Not the same as `needsReauth`, and saying so matters in both
   * directions.** `needsReauth` means the credential is dead and the user must
   * sign in again; telling them that when their notifications are merely stale
   * asks for a password they do not need. This one means the account still
   * works and is just quiet; treating it as "everything is fine" hides the one
   * thing they could fix by tapping it.
   *
   * Only ever set for accounts that explicitly enabled push. An account that
   * never asked for notifications has none to pause.
   */
  needsPushRebind: boolean;
}

export interface UseAccountsReturn {
  accounts: StoredAccount[];
  activeAccount: StoredAccount | null;
  accountCount: number;
  /**
   * `true` when no account is active *because the user deliberately signed
   * out* (or a stored session turned out to be dead), as opposed to "nothing
   * has ever been selected". Both look like `activeAccount === null`; this is
   * what tells them apart, and it survives a relaunch.
   */
  signedOut: boolean;
  /**
   * `true` when an account was refused admission because the map was already
   * full. Clears on the next successful admission and on any removal. See
   * `useAddAccount` for how it differs from `canAddAccount`.
   *
   * ⚠ **Render off it; do not read it eagerly.** The clear is dispatched from
   * `useAccountSync`'s Phase B effect, so it lands one render AFTER a successful
   * admission rather than synchronously inside the call that caused it. Reading
   * this straight after `await`ing a sign-in returns the pre-effect value —
   * potentially a `true` left over from an earlier, unrelated refusal. A
   * component that simply renders the flag always sees the settled value.
   */
  accountLimitReached: boolean;
}

export default function useAccounts(): UseAccountsReturn {
  const accountsMap = useSublaySelector(selectAccounts);
  const activeAccountId = useSublaySelector(selectActiveAccountId);
  const signedOut = useSublaySelector(selectSignedOut);
  const accountLimitReached = useSublaySelector(selectAccountLimitReached);

  return useMemo(() => {
    const byId = new Map<string, StoredAccount>();
    for (const [userId, entry] of Object.entries(accountsMap)) {
      byId.set(userId, {
        ...entry.user,
        // Defensive only — no persisted map can reach here without the field.
        // It has been written on every entry since multi-account shipped, and
        // Expo's chunked layout converts an older single-value store forward
        // rather than discarding it, carrying `tokenExpiresAt` across (and
        // defaulting it to 0 when an entry somehow lacks one). Kept because
        // "unknown expiry reads as expired" is the right answer if a
        // hand-built map ever arrives, not because legacy data does.
        tokenExpiresAt: entry.tokenExpiresAt ?? 0,
        needsReauth: accountNeedsReauth(entry),
        needsPushRebind: accountNeedsPushRebind(entry),
      });
    }

    const accountSummaries = Array.from(byId.values());
    // Keyed lookup, not a scan of the array: the map is keyed by user id and
    // that key is the authority on which entry is active.
    const activeAccount = activeAccountId
      ? byId.get(activeAccountId) ?? null
      : null;

    return {
      accounts: accountSummaries,
      activeAccount,
      accountCount: accountSummaries.length,
      signedOut,
      accountLimitReached,
    };
  }, [accountsMap, activeAccountId, signedOut, accountLimitReached]);
}
