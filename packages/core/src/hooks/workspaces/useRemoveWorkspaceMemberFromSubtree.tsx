import { useCallback } from "react";
import useProject from "../projects/useProject";
import useAxiosPrivate from "../../config/useAxiosPrivate";

export interface RemoveWorkspaceMemberFromSubtreeProps {
  workspaceId: string;
  // The TARGET user to offboard from this node and every descendant — a path
  // param, not an actor. The actor is always the bearer-token user.
  targetUserId: string;
}

export interface RemoveWorkspaceMemberFromSubtreeResponse {
  removedCount: number;
  removed: { workspaceId: string; userId: string }[];
}

/**
 * Remove the target user's direct memberships on this workspace AND every
 * descendant. Requires `remove-member` (rank-bounded per node). Blocks with 409
 * `workspace/owns-descendants` if the user OWNS any descendant workspace —
 * transfer or delete those first.
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
