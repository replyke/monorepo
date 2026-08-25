import { useCallback } from "react";
import useProject from "../projects/useProject";
import useAxiosPrivate from "../../config/useAxiosPrivate";
import {
  Workspace,
  WorkspaceIncludeParam,
} from "../../interfaces/models/Workspace";
import { PaginatedResponse } from "../../interfaces/PaginatedResponse";

export interface FetchManyWorkspacesParams {
  page?: number;
  limit?: number;
  /**
   * Include flags, as an array or a comma-separated string. `memberCount` adds
   * each row's DIRECT member count — one grouped query over the page that was
   * returned, so a switcher UI does not need a follow-up read per workspace.
   * Omitted, the field is absent from every row.
   */
  include?: WorkspaceIncludeParam;
}

/**
 * Leaf fetcher for the caller's direct-membership + owned workspaces. The actor
 * is derived from the bearer token — no actor field is sent.
 *
 * Params are built conditionally rather than passed through: the workspaces
 * endpoints refuse any undeclared top-level query key with a 400, so an
 * `undefined` slot must not be spread into the request.
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
      if (params?.include)
        queryParams.include = Array.isArray(params.include)
          ? params.include.join(",")
          : params.include;

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
