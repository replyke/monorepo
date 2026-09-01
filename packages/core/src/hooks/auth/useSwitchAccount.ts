import { useCallback, useState } from "react";
import { useStore } from "react-redux";
import { useSublayDispatch, useSublaySelector } from "../../store/hooks";
import type { SublayState } from "../../store/sublayReducers";
import { selectActiveAccountId } from "../../store/slices/accountsSlice";
import useProject from "../projects/useProject";
import {
  activateStoredAccount,
  AccountTransitionError,
} from "./accountTransition";

export interface UseSwitchAccountReturn {
  switchAccount: ({ userId }: { userId: string }) => Promise<void>;
  isSwitching: boolean;
  error: string | null;
}

export default function useSwitchAccount(): UseSwitchAccountReturn {
  const dispatch = useSublayDispatch();
  // The transition core validates the target's stored credential before it
  // tears anything down, which means reading the stored entry and writing the
  // rotated successor back — neither reachable through `dispatch` alone.
  const store = useStore<{ sublay: SublayState }>();
  const { projectId } = useProject();
  const activeAccountId = useSublaySelector(selectActiveAccountId);
  const [isSwitching, setIsSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const switchAccount = useCallback(
    async ({ userId }: { userId: string }) => {
      if (!projectId) throw new Error("No projectId available");

      // FROM THE LIVE STORE, not from the render snapshot this callback closes
      // over. The snapshot is exactly what goes stale — an account added after
      // the last render (a cross-tab map broadcast, a just-completed
      // `addAccount()`) would fail this guard against the old snapshot even
      // though the account is now switchable. Reading live means the guard's
      // answer is never older than the map itself.
      //
      // A REMOVAL doesn't need this: the transition core below re-reads the
      // live map on its own and rejects with `accountNotFound` regardless of
      // what this guard saw, so a stale-but-since-removed id is caught either
      // way. This guard's live read only changes the outcome for the
      // stale-but-since-added case.
      //
      // Typed, like every other failure this hook can produce: a stale id is a
      // different problem from a dead credential, and a caller should not have
      // to string-match to tell them apart.
      const stored = store.getState().sublay.accounts.accounts[userId];
      if (!stored) {
        throw new AccountTransitionError(
          `Account ${userId} not found`,
          false,
          true
        );
      }

      // ALREADY THERE — but only if there is a session to be there in.
      //
      // The selection alone is not proof of one. Two paths leave
      // `activeAccountId` naming an account whose session was torn down: a
      // sign-in refused at the account cap, which leaves the previous selection
      // standing without its session, and a launch that could not reach the
      // server, which leaves the stored account selected on purpose. In both,
      // this early return made re-tapping that account a no-op, so the only way
      // back into a session was to restart the app. Requiring a live access
      // token turns the re-tap into the recovery it looks like.
      const hasLiveSession = Boolean(
        store.getState().sublay.auth.accessToken
      );
      if (userId === activeAccountId && hasLiveSession) return;

      setIsSwitching(true);
      setError(null);

      try {
        // The whole sequence lives in the transition core, which validates the
        // target's stored credential BEFORE tearing anything down. A dead
        // credential REJECTS here and leaves the current session completely
        // untouched — it used to sign the user out of the account they were
        // happily using, because teardown ran first.
        await activateStoredAccount({
          dispatch,
          getState: () => store.getState(),
          projectId,
          userId,
          refreshToken: stored.refreshToken,
          previousActiveAccountId: activeAccountId,
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to switch account"
        );
        throw err;
      } finally {
        setIsSwitching(false);
      }
    },
    [dispatch, store, projectId, activeAccountId]
  );

  return { switchAccount, isSwitching, error };
}
