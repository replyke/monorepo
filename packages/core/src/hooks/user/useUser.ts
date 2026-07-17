import { useEffect, useMemo, useCallback } from "react";
import { useSublayDispatch, useSublaySelector } from "../../store/hooks";

import {
  setProjectContext,
  selectUser,
  selectUserLoading,
  selectUserUpdating,
  selectCurrentProjectId,
  selectUserError,
} from "../../store/slices/userSlice";
import { useUserActions } from "./useUserActions";
import useProject from "../projects/useProject";
import { selectUser as selectAuthUser } from "../../store/slices/authSlice";
import type { AuthUser } from "../../interfaces/models/User";
import type { UpdateUserParams } from "../../store/api/userApi";

export interface UseUserProps {}

/**
 * The furthest-reaching active suspension for the current user, or null.
 * Mirrors the server's "effective suspension" definition.
 */
export type ActiveSuspension = {
  reason: string | null;
  startDate: string;
  endDate: string | null;
};

export interface UseUserValues {
  user: AuthUser | null;
  loading: boolean;
  updating: boolean;
  error: string | null;

  // Derived suspension state (matches the server's effective-suspension definition)
  isSuspended: boolean;
  activeSuspension: ActiveSuspension | null;

  // Current user management actions
  updateUser: (update: UpdateUserParams) => Promise<AuthUser>;

  // Error handling
  clearError: () => void;
}

/**
 * Compute the effective active suspension from a user's `suspensions` array,
 * using the SAME definition as the server:
 *   - active = startDate <= now <= (endDate || infinity)
 *   - the effective row is the furthest-reaching active row, where a `null`
 *     endDate (indefinite) wins the tie (matches server `endDate DESC NULLS FIRST`).
 */
function computeActiveSuspension(
  suspensions: AuthUser["suspensions"] | undefined | null,
): ActiveSuspension | null {
  if (!suspensions || suspensions.length === 0) return null;

  const now = Date.now();

  const active = suspensions.filter((s) => {
    const start = new Date(s.startDate).getTime();
    if (Number.isNaN(start) || start > now) return false;
    if (s.endDate == null) return true; // indefinite
    const end = new Date(s.endDate).getTime();
    if (Number.isNaN(end)) return false;
    return end >= now;
  });

  if (active.length === 0) return null;

  // Pick the furthest-reaching row: a null endDate is furthest (wins),
  // otherwise the largest endDate wins.
  return active.reduce((furthest, current) => {
    if (furthest.endDate == null) return furthest;
    if (current.endDate == null) return current;
    return new Date(current.endDate).getTime() >
      new Date(furthest.endDate).getTime()
      ? current
      : furthest;
  });
}

/**
 * Redux-powered hook that provides comprehensive user management
 * This replaces useUserData and provides the same interface with Redux state management
 */
function useUser(_: UseUserProps = {}): UseUserValues {
  const dispatch = useSublayDispatch();

  // Get external context
  const { projectId } = useProject();

  // Get Redux state
  const user = useSublaySelector(selectUser);
  const authUser = useSublaySelector(selectAuthUser); // Fallback to auth user
  const loading = useSublaySelector(selectUserLoading);
  const updating = useSublaySelector(selectUserUpdating);
  const error = useSublaySelector(selectUserError);
  const currentProjectId = useSublaySelector(selectCurrentProjectId);

  // Get actions
  const {
    setUser,
    updateUser: updateUserAction,
    clearError,
  } = useUserActions();

  // Update Redux state when project changes
  useEffect(() => {
    if (projectId && projectId !== currentProjectId) {
      dispatch(setProjectContext(projectId));
    }
  }, [dispatch, projectId, currentProjectId]);

  // Sync auth user to user slice when auth user changes and we don't have a user yet
  // IMPORTANT: Only sync if authUser has valid data (has an id) to prevent empty objects from being set
  useEffect(() => {
    if (authUser && authUser.id && !user) {
      setUser(authUser);
    }
  }, [authUser, user, setUser]);

  // Current user operations with projectId included automatically
  const handleUpdateUser = useCallback(
    async (update: UpdateUserParams): Promise<AuthUser> => {
      if (!user) {
        throw new Error("No user available to update");
      }

      if (!projectId) {
        throw new Error("No projectId available");
      }

      // Pass current user for optimistic update reversion if needed
      return await updateUserAction({
        projectId,
        userId: user.id,
        update,
        currentUser: user,
      });
    },
    [updateUserAction, user, projectId],
  );

  // Return focused interface for current user management
  return useMemo(() => {
    const effectiveUser = user || authUser; // Fallback to auth user if user slice is empty
    const activeSuspension = computeActiveSuspension(
      effectiveUser?.suspensions,
    );

    return {
      user: effectiveUser,
      loading,
      updating,
      error,

      isSuspended: activeSuspension !== null,
      activeSuspension,

      updateUser: handleUpdateUser,

      clearError,
    };
  }, [user, authUser, loading, updating, error, handleUpdateUser, clearError]);
}

export default useUser;
