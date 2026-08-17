import { useCallback } from "react";
import useProject from "../projects/useProject";
import useAxiosPrivate from "../../config/useAxiosPrivate";

export interface RemoveWorkspaceMemberProps {
  workspaceId: string;
  // The TARGET member to remove — a path param, not an actor. The actor is
  // always the bearer-token user.
  targetUserId: string;
}

/**
 * Remove a direct member from this workspace node. Requires the `remove-member`
 * capability and is rank-bounded. Use `useRemoveWorkspaceMemberFromSubtree` to
 * offboard the same user from every descendant too.
 */
function useRemoveWorkspaceMember(): (
  props: RemoveWorkspaceMemberProps
) => Promise<void> {
  const { projectId } = useProject();
  const axios = useAxiosPrivate();

  const removeWorkspaceMember = useCallback(
    async ({ workspaceId, targetUserId }: RemoveWorkspaceMemberProps) => {
      if (!projectId) {
        throw new Error("No projectId available.");
      }
      if (!workspaceId) {
        throw new Error("Please pass a workspaceId");
      }
      if (!targetUserId) {
        throw new Error("Please pass a targetUserId");
      }

      await axios.delete<void>(
        `/${projectId}/workspaces/${workspaceId}/members/${targetUserId}`
      );
    },
    [projectId, axios]
  );

  return removeWorkspaceMember;
}

export default useRemoveWorkspaceMember;
