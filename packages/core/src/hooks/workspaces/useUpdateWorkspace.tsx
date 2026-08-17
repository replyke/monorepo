import { useCallback } from "react";
import useProject from "../projects/useProject";
import useAxiosPrivate from "../../config/useAxiosPrivate";
import { Workspace } from "../../interfaces/models/Workspace";

export interface UpdateWorkspaceProps {
  workspaceId: string;
  name?: string;
  metadata?: Record<string, any>;
}

/**
 * Update a workspace's name / metadata. The actor is the bearer-token user and
 * must be the owner or hold the `edit-workspace` capability.
 */
function useUpdateWorkspace(): (
  props: UpdateWorkspaceProps
) => Promise<Workspace> {
  const { projectId } = useProject();
  const axios = useAxiosPrivate();

  const updateWorkspace = useCallback(
    async ({ workspaceId, ...rest }: UpdateWorkspaceProps) => {
      if (!projectId) {
        throw new Error("No projectId available.");
      }
      if (!workspaceId) {
        throw new Error("Please pass a workspaceId");
      }

      // Client SDKs never send an actor `userId` — acting on behalf of another
      // user is the node-sdk service-key capability. Strip it defensively in
      // case a caller casts around the props type.
      const body: Record<string, any> = { ...rest };
      delete body.userId;

      const response = await axios.patch<Workspace>(
        `/${projectId}/workspaces/${workspaceId}`,
        body
      );

      return response.data;
    },
    [projectId, axios]
  );

  return updateWorkspace;
}

export default useUpdateWorkspace;
