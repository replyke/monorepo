import { useCallback } from "react";
import useProject from "../projects/useProject";
import useAxiosPrivate from "../../config/useAxiosPrivate";

export interface DeleteWorkspaceProps {
  workspaceId: string;
}

export interface DeleteWorkspaceResponse {
  message: string;
}

/**
 * Delete a workspace. Owner-only — the actor (the bearer-token user) must be
 * the workspace's own owner or an ancestor owner.
 */
function useDeleteWorkspace(): (
  props: DeleteWorkspaceProps
) => Promise<DeleteWorkspaceResponse> {
  const { projectId } = useProject();
  const axios = useAxiosPrivate();

  const deleteWorkspace = useCallback(
    async ({ workspaceId }: DeleteWorkspaceProps) => {
      if (!projectId) {
        throw new Error("No projectId available.");
      }
      if (!workspaceId) {
        throw new Error("Please pass a workspaceId");
      }

      const response = await axios.delete<DeleteWorkspaceResponse>(
        `/${projectId}/workspaces/${workspaceId}`
      );

      return response.data;
    },
    [projectId, axios]
  );

  return deleteWorkspace;
}

export default useDeleteWorkspace;
