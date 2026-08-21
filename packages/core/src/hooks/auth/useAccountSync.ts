import { useEffect, useRef } from "react";
import { useStore } from "react-redux";
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
  selectSignedOut,
  selectDeviceIdentifier,
  buildAccountMap,
  type AccountMap,
  type AccountSummary,
  type AccountEntry,
} from "../../store/slices/accountsSlice";
import {
  selectRefreshToken,
  setRefreshToken,
  resetAuth,
} from "../../store/slices/authSlice";
import { selectUser, clearUser } from "../../store/slices/userSlice";
import { requestNewAccessTokenThunk } from "../../store/slices/authThunks";
import { baseApi } from "../../store/api/baseApi";
import { resetAccountScopedState } from "../../store/actions";
import { handleError } from "../../utils/handleError";
import type { AccountStorage } from "../../interfaces/AccountStorage";
import {
  registerAccountStorage,
  runAccountStorageOp,
} from "../../config/accountStorage";
import { readJwtExp, readJwtSub } from "../../utils/jwt";
import { reconcileAccountPushBinding } from "../push/reconcilePushBindings";
import type { SublayState } from "../../store/sublayReducers";

// An unreadable `exp` is persisted as 0 — i.e. "already expired" — so a token
// we can't make sense of gets treated as stale rather than trusted. That is the
// OPPOSITE of the auth gate's policy for the same claim, deliberately: there,
// "unknown" must not trigger a rotation. The shared reader in `utils/jwt`
// returns null and leaves the choice to each call site.
function extractExpFromJwt(jwt: string): number {
  return readJwtExp(jwt) ?? 0;
}

/** A stable string for one device identifier, for the Phase E latch. */
function identifierLatchKey(identifier: {
  platform: string;
  token?: string;
  subscription?: { endpoint: string };
}): string {
  return identifier.platform === "web"
    ? identifier.subscription?.endpoint ?? "web"
    : identifier.token ?? identifier.platform;
}

export default function useAccountSync(
  storage: AccountStorage,
  projectId: string
): void {
  const dispatch = useSublayDispatch();
  const store = useStore<{ sublay: SublayState }>();
  const refreshToken = useSublaySelector(selectRefreshToken);
  const user = useSublaySelector(selectUser); // from userSlice (canonical)
  const accounts = useSublaySelector(selectAccounts);
  const activeAccountId = useSublaySelector(selectActiveAccountId);
  const signedOut = useSublaySelector(selectSignedOut);
  const deviceIdentifier = useSublaySelector(selectDeviceIdentifier);
  const isReady = useSublaySelector(selectAccountsReady);
  const isInitialLoadRef = useRef(true);

  // Phase D's listener is registered once (deps: projectId, dispatch) so it
  // cannot close over `activeAccountId` directly without going stale. A ref
  // gives it the current value without re-registering the listener on every
  // token rotation.
  const activeAccountIdRef = useRef(activeAccountId);
  activeAccountIdRef.current = activeAccountId;

  // Phase A: Mount — register + load from storage
  useEffect(() => {
    dispatch(registerAccountManager());

    // Publish the handle (and its projectId) so callers that must await a write
    // but cannot call a hook can reach it. Last mount wins and it is never
    // cleared on unmount — see `config/accountStorage`.
    registerAccountStorage(storage, projectId);

    const loadAccounts = async () => {
      try {
        const map = await runAccountStorageOp(projectId, () =>
          storage.getAccountMap(projectId)
        );
        if (map) {
          // If no active account is set (or it points to a removed account),
          // default to the first available account on load — UNLESS the user
          // deliberately signed out.
          //
          // `activeAccountId: null` is ambiguous on its own: it is both "the
          // user has never picked an account" and "the user just signed out"
          // (or a stored session turned out to be dead). Only the first should
          // fall back to the first stored account. Reading the second that way
          // is what used to silently re-activate an account the user had just
          // left, on the very next launch — the whole reason the persisted
          // `signedOut` field exists.
          const accountIds = Object.keys(map.accounts);
          if (
            !map.signedOut &&
            accountIds.length > 0 &&
            (!map.activeAccountId || !map.accounts[map.activeAccountId])
          ) {
            map.activeAccountId = accountIds[0];
          }

          dispatch(setAccountMap(map));
          if (
            !map.signedOut &&
            map.activeAccountId &&
            map.accounts[map.activeAccountId]
          ) {
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
      username: user.username ?? null,
      email: user.email ?? null,
      avatar: user.avatar ?? null,
    };

    const entry: AccountEntry = {
      refreshToken,
      tokenExpiresAt: extractExpFromJwt(refreshToken),
      user: summary,
    };

    dispatch(upsertAccount({ userId: user.id, entry }));

    // BACKSTOP — never activate an account the map did not admit.
    //
    // `upsertAccount` refuses at `MAX_ACCOUNTS` (raising `accountLimitReached`),
    // and this effect used to select the id regardless, leaving
    // `activeAccountId` naming a key that is not in `accounts` — the corrupt
    // shape this phase exists to remove, and one this effect then PERSISTS and
    // Phase A restores on the next launch.
    //
    // Read back from the store rather than from the `accounts` selector: the
    // dispatch above is synchronous, this render's selector value is not yet
    // updated, and the refusal is only visible in the store.
    //
    // The entry-point gates (Gate 1/Gate 2 in `authThunks`) are the owners of
    // this rule — they refuse the sign-in before it ever reaches here. This is
    // the defensive floor under them, because this effect is what actually
    // writes the persisted map.
    const admitted = Boolean(
      store.getState().sublay.accounts.accounts[user.id]
    );
    if (!admitted) return;

    if (user.id !== activeAccountId) {
      // Signing in while another account is active — the documented way to add
      // an account — changes the active account HERE and nowhere else: none of
      // the transition hooks runs on this path. So this is the sixth
      // account-changing path, and until now it dispatched neither
      // `resetApiState` nor a feature-slice reset, which carried the previous
      // account's query cache and slice state straight into the new session.
      //
      // Only on a real change of an EXISTING selection: the first sign-in of a
      // session moves `null` → id, where there is no previous account's state
      // to clear and resetting would needlessly drop what the sign-in itself
      // just populated.
      if (activeAccountId) {
        dispatch(baseApi.util.resetApiState());
        dispatch(resetAccountScopedState());
      }
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

    // Built from the slice's own state through the shared builder, so the
    // imperative callers that must await a write (the minted-token helper, push
    // reconciliation, the per-account toggle) and this effect can never persist
    // two different shapes.
    const map: AccountMap = buildAccountMap(store.getState().sublay.accounts);

    // THROUGH the mutex, not alongside it. This effect's own overlapping chains
    // are the race being serialized, so persisting on the raw handle here would
    // leave the mutex guarding nothing.
    //
    // Still fire-and-forget from React's point of view — an effect cannot await
    // — so the rejection the write contract now produces is caught here rather
    // than surfacing as an unhandled rejection. Callers that must not proceed
    // until the write lands use `persistAccountMapFor(projectId, map)` and
    // await it. (This effect does not: it holds its OWN handle and its own
    // projectId, which is already the correct pairing, so it goes straight
    // through the mutex.)
    runAccountStorageOp(projectId, () =>
      storage.setAccountMap(projectId, map)
    ).catch((error) => {
      handleError(error, "Failed to persist account map");
    });
  }, [accounts, activeAccountId, signedOut, deviceIdentifier, isReady]);

  // Phase E: Reconcile the NEWLY ACTIVE account's push binding
  //
  // ⚠ THIS PATH MUST NEVER TOUCH ANY OTHER ACCOUNT. Minting an access token for
  // a non-active account revokes that account's stored refresh token, so a
  // "reconcile every stored account on every transition" loop would revoke four
  // tokens per switch, leave the map holding the revoked copies, and destroy
  // each of those accounts on the next pass — systematically killing every
  // account the user is not currently using. `reconcileAccountPushBinding` is
  // single-account by construction and is the only reconcile call reachable
  // from here.
  //
  // The single-account pass is free: the newly active account's session is
  // already live, so it uses the live access token and mints nothing.
  //
  // ⚠ IT IS ALSO WHERE A DEFERRED RE-BIND IS REPAIRED. A device-token rotation
  // marks each opted-in background account instead of exchanging its
  // credential, and this is the pass that clears the mark — using the session
  // the activation just established. That is why it must stay unconditional
  // per (account, identifier) rather than being latched on the account alone.
  //
  // ⚠ AND IT REQUIRES AN EXPLICIT PREFERENCE. This effect runs on every
  // activation, and a plain sign-in IS an activation. The device identifier
  // deliberately survives a sign-out-all — it is device state, not account
  // state — so on a shared device, reading an absent `pushEnabled` as consent
  // meant the next person to sign in was push-bound to an identifier the
  // previous user left behind, having granted nothing, with the app never
  // calling `register()`, and it survived a restart. `reconcileAccountPushBinding`
  // leaves an account with no expressed preference completely alone; enabling
  // push still takes the deliberate `register()` call it always did.
  //
  // Gated on the live session actually belonging to the active account, so a
  // transition still mid-flight (tokens swapped, `user` not yet caught up) does
  // not reconcile under the outgoing identity.
  const lastReconciledRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isReady) return;

    if (!activeAccountId || !deviceIdentifier || user?.id !== activeAccountId) {
      // Signing out clears the latch so the next activation reconciles again.
      if (!activeAccountId) lastReconciledRef.current = null;
      return;
    }

    // Keyed by account AND identifier: a device-token rotation must not be
    // swallowed by a latch that only remembers the account. That pairing is
    // load-bearing now rather than defensive — a rotation marks the background
    // accounts and re-binds only the active one, so this is the pass that
    // repairs the account the user is standing in when the identifier changes
    // underneath it.
    const key = `${activeAccountId}:${identifierLatchKey(deviceIdentifier)}`;
    if (lastReconciledRef.current === key) return;
    lastReconciledRef.current = key;

    reconcileAccountPushBinding(
      { dispatch, getState: () => store.getState(), projectId },
      activeAccountId
    ).catch((error) => {
      // Best-effort: a transition must not fail because a push binding could
      // not be brought in line. The next transition retries.
      lastReconciledRef.current = null;
      handleError(error, "Failed to reconcile the push binding for this account");
    });
  }, [activeAccountId, deviceIdentifier, user?.id, isReady, projectId]);

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

        // Cross-tab sync is a full account transition, not a state mirror: the
        // other tab may have switched accounts or signed out entirely, and this
        // tab is still rendering the previous account's cache and slice state.
        const incomingId =
          !map.signedOut && map.activeAccountId
            ? map.activeAccountId
            : null;

        // A DIFFERENT identity is arriving, as opposed to the same account's
        // refresh token having rotated in the other tab. Only the first is a
        // transition; the second happens on every ordinary rotation and must
        // stay a cheap token update (see the install branch below).
        const identityChanged = incomingId !== activeAccountIdRef.current;

        if (identityChanged) {
          dispatch(baseApi.util.resetApiState());
          dispatch(resetAccountScopedState());
        }

        if (incomingId && map.accounts[incomingId]) {
          // TEAR DOWN BEFORE INSTALLING — the same sequence
          // `activateStoredAccount` runs, for the same reason.
          //
          // Installing only the refresh token left this tab holding the
          // OUTGOING account's access token and user profile while
          // `activeAccountId` named the incoming one. Access tokens live 30
          // minutes and the auth gate only rotates within 60s of expiry, so
          // for up to ~29 minutes the tab read AND wrote as the previous
          // account under a switcher showing the new one — and because the
          // cache was just dropped above, it refetched immediately under the
          // wrong identity.
          //
          // With the access token cleared, nothing can go out as the outgoing
          // account: the gate hands out a null credential rather than A's.
          //
          // NOT on a same-account rotation: clearing the session there would
          // force a needless re-authentication round trip every time the other
          // tab rotated its token, which is every refresh.
          if (identityChanged) {
            dispatch(resetAuth());
            dispatch(clearUser());
          }
          dispatch(setRefreshToken(map.accounts[incomingId].refreshToken));

          // ...AND MINT THE INCOMING ACCOUNT'S SESSION. The teardown above is
          // only half a transition on its own, because NOTHING ELSE WOULD EVER
          // RESTORE ONE HERE:
          //
          //   - `initializeAuthThunk` runs once, from a mount effect whose deps
          //     are all stable afterwards, so it does not re-run on a switch.
          //   - The gate does not park the request either. `resetAuth` leaves
          //     `initialized` alone, so the gate stays OPEN and simply reports
          //     "no token" — it rotates a near-expiry token, never a null one.
          //   - The reactive refresh-on-403 lives on `axiosPrivate`, so it only
          //     fires if something happens to make a `requireUserAuth` call. A
          //     tab rendering signed-out UI issues `optionalUserAuth` reads,
          //     which answer 200-as-a-stranger; there is no error to react to.
          //   - `baseApi` has no reauth wrapper at all, and `resetApiState()`
          //     two lines above forces every mounted query to refetch straight
          //     away — caching stranger data under args that never change
          //     again.
          //
          // So the tab would sit signed-out under a switcher naming the
          // incoming account until something else woke it. This dispatch is the
          // convergence step.
          //
          // SAFE TO ROTATE HERE, and this is the question worth asking, because
          // presenting a spent refresh token destroys an account's whole token
          // family. What is being presented is the SUCCESSOR the originating
          // tab already exchanged for and durably persisted before it
          // broadcast — not the token it spent. And when this rotation
          // produces a successor of its own, the same-identity branch above
          // carries it back to every other tab, so none of them is left holding
          // the spent copy.
          //
          // Several tabs receiving one switch all present that same successor
          // within milliseconds of each other. That is FINE, and better than
          // the alternative: the server keeps a 30-second grace window in which
          // a re-presented token returns the family's live successor instead of
          // destroying the family (`requestNewAccessToken.ts`), and
          // simultaneous presentations land inside it by construction, where
          // lazily staggered ones might not.
          //
          // Only on an identity change — doing this on every rotation
          // broadcast would have every tab re-rotate every other tab's
          // rotation, forever.
          if (identityChanged) {
            dispatch(
              requestNewAccessTokenThunk({ projectId })
            ).catch((error: unknown) => {
              // The thunk already reports its own failures and never rejects
              // unless unwrapped; this is belt-and-braces so a rejection can
              // never surface as an unhandled one from inside an event handler.
              handleError(error, "Failed to restore the session after a cross-tab switch");
            });
          }
        } else {
          // The other tab signed out. Tear the local session down too —
          // previously this branch did nothing at all, leaving this tab
          // authenticated against a map that no longer holds its credential.
          dispatch(resetAuth());
          dispatch(clearUser());
        }
      } catch (error) {
        handleError(error, "Failed to sync account map from storage event");
      }
    };

    window.addEventListener("storage", handleStorageEvent);
    return () => window.removeEventListener("storage", handleStorageEvent);
  }, [projectId, dispatch]);
}
