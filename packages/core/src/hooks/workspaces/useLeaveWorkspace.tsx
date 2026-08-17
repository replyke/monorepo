import { useCallback } from "react";
import useProject from "../projects/useProject";
import useAxiosPrivate from "../../config/useAxiosPrivate";

export interface LeaveWorkspaceProps {
  workspaceId: string;
}

/**
 * Self-service departure — removes the bearer-token user's DIRECT membership on
 * this node only (descendant memberships are untouched). An owner cannot leave
 * their own workspace; transfer ownership or delete it first.
 */
function useLeaveWorkspace(): (props: LeaveWorkspaceProps) => Promise<void> {
  const { projectId } = useProject();
  const axios = useAxiosPrivate();

  const leaveWorkspace = useCallback(
    async ({ workspaceId }: LeaveWorkspaceProps) => {
      if (!projectId) {
        throw new Error("No projectId available.");
      }
      if (!workspaceId) {
        throw new Error("Please pass a workspaceId");
      }

      await axios.delete<void>(
        `/${projectId}/workspaces/${workspaceId}/members/me`
      );
    },
    [projectId, axios]
  );

  return leaveWorkspace;
}

export default useLeaveWorkspace;
