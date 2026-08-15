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
  useState(() => {
    // Never arm during SSR. `authGate` holds module-level state, which on a
    // Node server is process-global and shared across concurrent requests —
    // and effects never run there, so `syncAuthGate` would never open what
    // render armed. Every subsequent request in that process would then stall
    // for the full ready timeout. There is no session to wait for server-side
    // anyway: tokens live in the browser.
    if (typeof window === "undefined") return null;
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
      if (requestNewAccessTokenThunk.fulfilled.match(result)) {
        return result.payload;
      }
      return undefined;
    });

    return () => setAuthGateRefresher(undefined);
  }, [projectId, dispatch]);
}
