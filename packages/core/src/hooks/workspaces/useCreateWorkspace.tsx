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

      // Client SDKs never send an actor `userId` — acting on behalf of another
      // user is the node-sdk service-key capability. Strip it defensively in
      // case a caller casts around the props type.
      const body: Record<string, any> = { ...props };
      delete body.userId;

      const response = await axios.post<Workspace>(
        `/${projectId}/workspaces`,
        body
      );

      return response.data;
    },
    [projectId, axios]
  );

  return createWorkspace;
}

export default useCreateWorkspace;
