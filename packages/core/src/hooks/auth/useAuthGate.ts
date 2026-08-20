import { useEffect, useState } from "react";
import { useStore } from "react-redux";
import type { SublayState } from "../../store/sublayReducers";
import {
  armAuthGate,
  syncAuthGate,
  setAuthGateRefresher,
} from "../../config/authGate";
import { requestNewAccessTokenThunk } from "../../store/slices/authThunks";
import { useSublayDispatch } from "../../store/hooks";

/**
 * Keeps the request-path auth gate (`config/authGate`) in step with the store.
 * Mounted by both providers — `SublayStoreProvider` (store mode) and
 * `SublayIntegrationProvider` (integration mode) — because the gate has to work
 * regardless of whose store is underneath.
 *
 * Arming happens in the render body rather than an effect: React runs child
 * effects before parent effects, so a gate armed in the provider's effect would
 * already have let through the mount-time requests it exists to hold.
 *
 * State is mirrored via a raw `store.subscribe` instead of `useSelector` so
 * token rotations don't re-render the provider — and through it, every app that
 * mounts Sublay at its root.
 */
export default function useAuthGate(projectId: string): void {
  const store = useStore();
  const dispatch = useSublayDispatch();

  // Lazy initializer: runs once, during this component's render, which is
  // strictly before any child renders or schedules an effect.
  // `armAuthGate` is itself a no-op during SSR — see its own guard.
  useState(() => {
    armAuthGate();
    return null;
  });

  useEffect(() => {
    const sync = () => {
      const state = store.getState() as { sublay?: SublayState };
      syncAuthGate({
        accessToken: state.sublay?.auth?.accessToken ?? null,
        initialized: state.sublay?.auth?.initialized ?? false,
      });
    };

    sync();
    return store.subscribe(sync);
  }, [store]);

  useEffect(() => {
    // Bound refresher for pre-emptive rotation of a near-expiry token. Shares
    // the single-flight lock in `refreshAccessToken` with the response
    // interceptor's reactive 403 path, so a burst of waking requests rotates
    // the refresh token exactly once.
    setAuthGateRefresher(async () => {
      if (!projectId) return undefined;

      const result = await dispatch(requestNewAccessTokenThunk({ projectId }));

      // Guard on the PAYLOAD, not just on `fulfilled.match`. This site used to
      // return `result.payload` behind a bare `fulfilled.match`, which is
      // `undefined` in exactly the case that matters — the thunk used to
      // early-return (and therefore *fulfil*) when no refresh token was
      // present. `undefined` happens to be the right answer here, so the old
      // shape limped along, but it read as "a fulfilled refresh succeeded" and
      // was copied to four other sites where it was not harmless.
      //
      // Deliberately does NOT rethrow: a refresher that REJECTS would reject
      // the shared single-flight promise, and through it the axios request
      // interceptor and RTK's `prepareHeaders` — killing requests before they
      // are sent, app-wide. The gate wants "no new token", not an exception.
      // See the guard in `config/authGate.ts`.
      if (
        requestNewAccessTokenThunk.fulfilled.match(result) &&
        result.payload
      ) {
        return result.payload;
      }
      return undefined;
    });

    // Deliberately no cleanup. Clearing on unmount is worse than leaving a
    // stale closure: with two providers mounted, unmounting one would strip the
    // survivor's refresher (this effect's deps wouldn't re-run to restore it),
    // silently dropping pre-emptive rotation back to the reactive 403 path. A
    // later mount overwrites this registration anyway.
  }, [projectId, dispatch]);
}
