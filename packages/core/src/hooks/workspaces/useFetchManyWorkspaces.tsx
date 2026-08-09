import { useCallback } from "react";
import useProject from "../projects/useProject";
import useAxiosPrivate from "../../config/useAxiosPrivate";
import { Workspace } from "../../interfaces/models/Workspace";
import { PaginatedResponse } from "../../interfaces/PaginatedResponse";

export interface FetchManyWorkspacesParams {
  page?: number;
  limit?: number;
  include?: string;
}

/**
 * Leaf fetcher for the caller's direct-membership + owned workspaces. The actor
 * is derived from the bearer token — no `userId` is sent.
 */
function useFetchManyWorkspaces(): (
  params?: FetchManyWorkspacesParams
) => Promise<PaginatedResponse<Workspace>> {
  const { projectId } = useProject();
  const axios = useAxiosPrivate();

  const fetchManyWorkspaces = useCallback(
    async (params?: FetchManyWorkspacesParams) => {
      if (!projectId) {
        throw new Error("No projectId available.");
      }

      const queryParams: Record<string, any> = {};
      if (params?.page !== undefined) queryParams.page = params.page;
      if (params?.limit !== undefined) queryParams.limit = params.limit;
      if (params?.include) queryParams.include = params.include;

      const response = await axios.get<PaginatedResponse<Workspace>>(
        `/${projectId}/workspaces`,
        { params: queryParams }
      );

      return response.data;
    },
    [projectId, axios]
  );

  return fetchManyWorkspaces;
}

export default useFetchManyWorkspaces;
