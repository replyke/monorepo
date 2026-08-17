import { useCallback } from "react";
import useProject from "../projects/useProject";
import useAxiosPrivate from "../../config/useAxiosPrivate";
import { WorkspaceInvitation } from "../../interfaces/models/Workspace";

export interface FetchWorkspaceInvitesProps {
  workspaceId: string;
}

export interface FetchWorkspaceInvitesResponse {
  data: WorkspaceInvitation[];
}

/**
 * List the LIVE pending invites a workspace has ISSUED (`status='pending' AND
 * expiresAt > now`). Requires the `invite` capability (or owner). Returned in
 * full — this list is deliberately unpaginated.
 *
 * Not to be confused with `useFetchMyWorkspaceInvites`, which lists the invites
 * addressed TO the signed-in user across all workspaces.
 */
function useFetchWorkspaceInvites(): (
  props: FetchWorkspaceInvitesProps
) => Promise<FetchWorkspaceInvitesResponse> {
  const { projectId } = useProject();
  const axios = useAxiosPrivate();

  const fetchWorkspaceInvites = useCallback(
    async ({ workspaceId }: FetchWorkspaceInvitesProps) => {
      if (!projectId) {
        throw new Error("No projectId available.");
      }
      if (!workspaceId) {
        throw new Error("Please pass a workspaceId");
      }

      const response = await axios.get<FetchWorkspaceInvitesResponse>(
        `/${projectId}/workspaces/${workspaceId}/invites`
      );

      return response.data;
    },
    [projectId, axios]
  );

  return fetchWorkspaceInvites;
}

export default useFetchWorkspaceInvites;
