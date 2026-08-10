import { useCallback } from "react";
import useProject from "../projects/useProject";
import useAxiosPrivate from "../../config/useAxiosPrivate";
import {
  Workspace,
  WorkspaceIncludeParam,
} from "../../interfaces/models/Workspace";

export interface FetchWorkspaceProps {
  workspaceId: string;
  include?: WorkspaceIncludeParam;
}

function useFetchWorkspace(): (
  props: FetchWorkspaceProps
) => Promise<Workspace> {
  const { projectId } = useProject();
  const axios = useAxiosPrivate();

  const fetchWorkspace = useCallback(
    async ({ workspaceId, include }: FetchWorkspaceProps) => {
      if (!projectId) {
        throw new Error("No projectId available.");
      }
      if (!workspaceId) {
        throw new Error("Please pass a workspaceId");
      }

      const response = await axios.get<Workspace>(
        `/${projectId}/workspaces/${workspaceId}`,
        {
          params: include
            ? {
                include: Array.isArray(include) ? include.join(",") : include,
              }
            : undefined,
        }
      );

      return response.data;
    },
    [projectId, axios]
  );

  return fetchWorkspace;
}

export default useFetchWorkspace;
