import { SublayHttpClient } from "../../core/client";
import { WorkspaceInvitation } from "../../interfaces/Workspace";

export interface FetchMyWorkspaceInvitesProps {
  // The user whose live pending invites to read (matched by `userId`). Required
  // for the service key (act-as-user).
  userId: string;
}

export interface FetchMyWorkspaceInvitesResponse {
  data: WorkspaceInvitation[];
}

/**
 * The user's LIVE pending invites (`status='pending' AND expiresAt > now`),
 * matched by `userId`. Surfacing is NOT verification-gated (the verified check
 * applies when the user ACTS on an invite — accept or decline).
 */
export async function fetchMyWorkspaceInvites(
  client: SublayHttpClient,
  data: FetchMyWorkspaceInvitesProps
): Promise<FetchMyWorkspaceInvitesResponse> {
  const { userId } = data;
  const response = await client.projectInstance.get<FetchMyWorkspaceInvitesResponse>(
    "/me/workspace-invites",
    { params: { userId } }
  );
  return response.data;
}
