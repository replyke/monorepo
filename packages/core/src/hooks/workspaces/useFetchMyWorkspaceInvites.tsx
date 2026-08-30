import { useCallback } from "react";
import useProject from "../projects/useProject";
import useAxiosPrivate from "../../config/useAxiosPrivate";
import { MyWorkspaceInvitation } from "../../interfaces/models/Workspace";

export interface FetchMyWorkspaceInvitesResponse {
  data: MyWorkspaceInvitation[];
}

/**
 * The bearer-token user's LIVE pending invites (`status='pending' AND expiresAt
 * > now`), matched by `userId` from the token. Surfacing is NOT
 * verification-gated (the verified check applies when the user ACTS on an
 * invite — accept or decline).
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
