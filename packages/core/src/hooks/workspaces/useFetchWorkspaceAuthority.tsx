import { useCallback } from "react";
import useProject from "../projects/useProject";
import useAxiosPrivate from "../../config/useAxiosPrivate";
import { WorkspaceAuthority } from "../../interfaces/models/Workspace";

export interface FetchWorkspaceAuthorityProps {
  workspaceId: string;
}

/**
 * Authority-as-a-service read — the bearer-token user's resolved standing
 * (`{ reasons, capabilities, permissions, rank }`) on the workspace. A
 * permission check is a one-line `.includes()` on the result.
 */
function useFetchWorkspaceAuthority(): (
  props: FetchWorkspaceAuthorityProps
) => Promise<WorkspaceAuthority> {
  const { projectId } = useProject();
  const axios = useAxiosPrivate();

  const fetchWorkspaceAuthority = useCallback(
    async ({ workspaceId }: FetchWorkspaceAuthorityProps) => {
      if (!projectId) {
        throw new Error("No projectId available.");
      }
      if (!workspaceId) {
        throw new Error("Please pass a workspaceId");
      }

      const response = await axios.get<WorkspaceAuthority>(
        `/${projectId}/workspaces/${workspaceId}/authority/me`
      );

      return response.data;
    },
    [projectId, axios]
  );

  return fetchWorkspaceAuthority;
}

export default useFetchWorkspaceAuthority;
