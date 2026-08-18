import { useCallback } from "react";
import useProject from "../projects/useProject";
import useAxiosPrivate from "../../config/useAxiosPrivate";

export interface RemoveWorkspaceMemberFromSubtreeProps {
  workspaceId: string;
  // The TARGET user to offboard from this node and every descendant — a path
  // param, not an actor. The actor is always the bearer-token user.
  targetUserId: string;
}

/**
 * One descendant the subtree sweep did NOT clear, where the target user still
 * holds a direct membership.
 *
 * `id` / `name` are `null` when the acting user has no standing on that
 * workspace — the sweep reports THAT a membership survived without disclosing
 * the existence or name of a sealed sub-workspace the actor has no authority
 * over (the same sealing fence the descendant roster read applies).
 */
export interface SkippedWorkspace {
  id: string | null;
  name: string | null;
  /** Why it was skipped. `out-of-reach`: the actor's authority does not extend there. */
  reason: "out-of-reach";
}

export interface RemoveWorkspaceMemberFromSubtreeResponse {
  removedCount: number;
  removed: { workspaceId: string; userId: string }[];
  /**
   * How many descendant memberships the target RETAINED because the sweep could
   * not reach them. Always `0` for an owner / ancestor-owner / privileged key.
   * A non-zero value means the offboarding is PARTIAL — never conclude a user is
   * fully removed from `removedCount` alone.
   */
  skippedCount: number;
  /** One entry per retained membership; `skippedCount === skipped.length`. */
  skipped: SkippedWorkspace[];
}

/**
 * Remove the target user's direct memberships on this workspace AND every
 * descendant. Requires `remove-member` (rank-bounded per node). Blocks with 409
 * `workspace/owns-descendants` if the user OWNS any descendant workspace —
 * transfer or delete those first.
 *
 * A NON-owner's sweep can be PARTIAL: it stops at sealed sub-workspaces. Always
 * check `skippedCount` / `skipped` before treating someone as fully offboarded.
 */
function useRemoveWorkspaceMemberFromSubtree(): (
  props: RemoveWorkspaceMemberFromSubtreeProps
) => Promise<RemoveWorkspaceMemberFromSubtreeResponse> {
  const { projectId } = useProject();
  const axios = useAxiosPrivate();

  const removeWorkspaceMemberFromSubtree = useCallback(
    async ({
      workspaceId,
      targetUserId,
    }: RemoveWorkspaceMemberFromSubtreeProps) => {
      if (!projectId) {
        throw new Error("No projectId available.");
      }
      if (!workspaceId) {
        throw new Error("Please pass a workspaceId");
      }
      if (!targetUserId) {
        throw new Error("Please pass a targetUserId");
      }

      const response =
        await axios.post<RemoveWorkspaceMemberFromSubtreeResponse>(
          `/${projectId}/workspaces/${workspaceId}/members/${targetUserId}/remove-from-subtree`,
          {}
        );

      return response.data;
    },
    [projectId, axios]
  );

  return removeWorkspaceMemberFromSubtree;
}

export default useRemoveWorkspaceMemberFromSubtree;
