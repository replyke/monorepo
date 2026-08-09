import { useCallback } from "react";
import useProject from "../projects/useProject";
import useAxiosPrivate from "../../config/useAxiosPrivate";
import {
  WorkspaceRosterResponse,
  WorkspaceRosterCountsResponse,
} from "../../interfaces/models/Workspace";

export interface FetchWorkspaceMembersProps {
  workspaceId: string;
  // Comma-separated add-on buckets: `ancestorOwners`, `reachHolders`,
  // `descendants`. Default returns owner + direct members only.
  include?: string;
  // Numbers-only escape hatch — per-reason counts + distinct-user total.
  countOnly?: boolean;
}

/**
 * Unified roster read — one entry per distinct user, each with a `reasons`
 * array. Always returned in full (never paginated). With `countOnly` the shape
 * is `WorkspaceRosterCountsResponse`.
 */
function useFetchWorkspaceMembers(): (
  props: FetchWorkspaceMembersProps
) => Promise<WorkspaceRosterResponse | WorkspaceRosterCountsResponse> {
  const { projectId } = useProject();
  const axios = useAxiosPrivate();

  const fetchWorkspaceMembers = useCallback(
    async ({ workspaceId, include, countOnly }: FetchWorkspaceMembersProps) => {
      if (!projectId) {
        throw new Error("No projectId available.");
      }
      if (!workspaceId) {
        throw new Error("Please pass a workspaceId");
      }

      const params: Record<string, any> = {};
      if (include) params.include = include;
      if (countOnly !== undefined) params.countOnly = countOnly;

      const response = await axios.get<
        WorkspaceRosterResponse | WorkspaceRosterCountsResponse
      >(`/${projectId}/workspaces/${workspaceId}/members`, { params });

      return response.data;
    },
    [projectId, axios]
  );

  return fetchWorkspaceMembers;
}

export default useFetchWorkspaceMembers;
