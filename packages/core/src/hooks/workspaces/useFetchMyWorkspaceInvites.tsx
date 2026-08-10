import { useCallback } from "react";
import useProject from "../projects/useProject";
import useAxiosPrivate from "../../config/useAxiosPrivate";
import { WorkspaceInvitation } from "../../interfaces/models/Workspace";

export interface FetchMyWorkspaceInvitesResponse {
  data: WorkspaceInvitation[];
}

/**
 * The bearer-token user's LIVE pending invites (`status='pending' AND expiresAt
 * > now`), matched by `userId` from the token. Surfacing is NOT
 * verification-gated (the verified check applies only at accept).
 */
function useFetchMyWorkspaceInvites(): () => Promise<FetchMyWorkspaceInvitesResponse> {
  const { projectId } = useProject();
  const axios = useAxiosPrivate();

  const fetchMyWorkspaceInvites = useCallback(async () => {
    if (!projectId) {
      throw new Error("No projectId available.");
    }

    const response = await axios.get<FetchMyWorkspaceInvitesResponse>(
      `/${projectId}/me/workspace-invites`
    );

    return response.data;
  }, [projectId, axios]);

  return fetchMyWorkspaceInvites;
}

export default useFetchMyWorkspaceInvites;
