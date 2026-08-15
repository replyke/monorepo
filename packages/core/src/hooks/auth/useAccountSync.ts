import { useEffect, useRef } from "react";
import { useSublayDispatch, useSublaySelector } from "../../store/hooks";
import {
  setAccountMap,
  upsertAccount,
  setActiveAccount,
  setAccountsReady,
  registerAccountManager,
  selectAccounts,
  selectActiveAccountId,
  selectAccountsReady,
  type AccountMap,
  type AccountSummary,
  type AccountEntry,
} from "../../store/slices/accountsSlice";
import { selectRefreshToken, setRefreshToken } from "../../store/slices/authSlice";
import { selectUser } from "../../store/slices/userSlice";
import { handleError } from "../../utils/handleError";
import type { AccountStorage } from "../../interfaces/AccountStorage";
import { readJwtExp, readJwtSub } from "../../utils/jwt";

// An unreadable `exp` is persisted as 0 — i.e. "already expired" — so a token
// we can't make sense of gets treated as stale rather than trusted. That is the
// OPPOSITE of the auth gate's policy for the same claim, deliberately: there,
// "unknown" must not trigger a rotation. The shared reader in `utils/jwt`
// returns null and leaves the choice to each call site.
function extractExpFromJwt(jwt: string): number {
  return readJwtExp(jwt) ?? 0;
}

export default function useAccountSync(
  storage: AccountStorage,
  projectId: string
): void {
  const dispatch = useSublayDispatch();
  const refreshToken = useSublaySelector(selectRefreshToken);
  const user = useSublaySelector(selectUser); // from userSlice (canonical)
  const accounts = useSublaySelector(selectAccounts);
  const activeAccountId = useSublaySelector(selectActiveAccountId);
  const isReady = useSublaySelector(selectAccountsReady);
  const isInitialLoadRef = useRef(true);

  // Phase A: Mount — register + load from storage
  useEffect(() => {
    dispatch(registerAccountManager());

    const loadAccounts = async () => {
      try {
        const map = await storage.getAccountMap(projectId);
        if (map) {
          // If no active account is set (or it points to a removed account),
          // default to the first available account on load
          const accountIds = Object.keys(map.accounts);
          if (
            accountIds.length > 0 &&
            (!map.activeAccountId || !map.accounts[map.activeAccountId])
          ) {
            map.activeAccountId = accountIds[0];
          }

          dispatch(setAccountMap(map));
          if (map.activeAccountId && map.accounts[map.activeAccountId]) {
            dispatch(
              setRefreshToken(map.accounts[map.activeAccountId].refreshToken)
            );
          }
        }
      } catch (error) {
        handleError(error, "Failed to load account map from storage");
      } finally {
        dispatch(setAccountsReady(true));
      }
    };

    loadAccounts();
  }, []); // projectId is stable for lifetime of SublayProvider

  // Phase B: Watch refreshToken + user — upsert account entries
  useEffect(() => {
    if (!isReady || !refreshToken || !user?.id) return;

    // Guard against a transient token/user desync. The accounts map keys by user.id but the entry
    // stores the CURRENT refresh token, so if the two are momentarily mismatched we'd persist the
    // wrong pairing — two account ids sharing one refresh token, a corrupt map that breaks switching
    // and sign-out. Two flows cause this: (1) an OAuth callback sets the new tokens via setTokens
    // while `user` only resolves a tick later, and (2) cross-tab sync (Phase D) swaps in another
    // account's refresh token while this tab's `user` is still the previous account.
    //
    // The refresh token is itself a JWT whose `sub` is the id it was minted for — and it's the
    // credential we're about to store — so validate ITS sub against the current user (the access
    // token can be staler than the refresh token, e.g. case 2, so it isn't a reliable signal here).
    // Only persist once they agree; otherwise skip and wait — the effect re-runs (deps: refreshToken,
    // user) when they catch up.
    const sub = readJwtSub(refreshToken);
    if (sub && sub !== user.id) return;

    const summary: AccountSummary = {
      id: user.id,
      name: user.name ?? null,
      email: user.email ?? null,
      avatar: user.avatar ?? null,
    };

    const entry: AccountEntry = {
      refreshToken,
      tokenExpiresAt: extractExpFromJwt(refreshToken),
      user: summary,
    };

    dispatch(upsertAccount({ userId: user.id, entry }));

    if (user.id !== activeAccountId) {
      dispatch(setActiveAccount(user.id));
    }
  }, [refreshToken, user, isReady]);

  // Phase C: Persist map on changes
  useEffect(() => {
    if (!isReady) return;

    // Skip persisting the initial load (that data came FROM storage)
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      return;
    }

    const map: AccountMap = { activeAccountId, accounts };
    storage.setAccountMap(projectId, map).catch((error) => {
      handleError(error, "Failed to persist account map");
    });
  }, [accounts, activeAccountId, isReady]);

  // Phase D: Cross-tab sync (web only)
  useEffect(() => {
    // React Native exposes a partial `window` global without the DOM event API,
    // so `typeof window === "undefined"` passes there and then crashes on
    // window.addEventListener. Require the listener API to actually exist.
    if (
      typeof window === "undefined" ||
      typeof window.addEventListener !== "function"
    )
      return;

    const storageKey = `sublay-accounts:${projectId}`;

    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key !== storageKey || !event.newValue) return;
      try {
        const map: AccountMap = JSON.parse(event.newValue);
        dispatch(setAccountMap(map));
        if (map.activeAccountId && map.accounts[map.activeAccountId]) {
          dispatch(
            setRefreshToken(map.accounts[map.activeAccountId].refreshToken)
          );
        }
      } catch (error) {
        handleError(error, "Failed to sync account map from storage event");
      }
    };

    window.addEventListener("storage", handleStorageEvent);
    return () => window.removeEventListener("storage", handleStorageEvent);
  }, [projectId, dispatch]);
}
