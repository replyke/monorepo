import { useCallback } from "react";
import useProject from "../projects/useProject";
import useAxiosPrivate from "../../config/useAxiosPrivate";
import { Workspace } from "../../interfaces/models/Workspace";

export interface CreateWorkspaceProps {
  name: string;
  metadata?: Record<string, any>;
  // Optional parent for child creation; absent → root workspace.
  parentWorkspaceId?: string | null;
}

/**
 * Create a root or child workspace. The creator (the bearer-token user) becomes
 * the owner. Root creation requires a verified email.
 */
function useCreateWorkspace(): (
  props: CreateWorkspaceProps
) => Promise<Workspace> {
  const { projectId } = useProject();
  const axios = useAxiosPrivate();

  const createWorkspace = useCallback(
    async (props: CreateWorkspaceProps) => {
      if (!projectId) {
        throw new Error("No projectId available.");
      }
      if (!props.name) {
        throw new Error("Workspace name is required");
      }

      const response = await axios.post<Workspace>(
        `/${projectId}/workspaces`,
        props
      );

      return response.data;
    },
    [projectId, axios]
  );

  return createWorkspace;
}

export default useCreateWorkspace;
