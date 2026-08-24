import { SublayHttpClient } from "../../core/client";
import { WorkspaceInvitation } from "../../interfaces/Workspace";

export interface FetchMyWorkspaceInvitesProps {
  // The acting user whose live pending invites to read (invites are matched
  // by the invitation's `userId`). Required for the service key (act-as-user).
  actingUserId: string;
}

export interface FetchMyWorkspaceInvitesResponse {
  data: WorkspaceInvitation[];
}

/**
 * The acting user's LIVE pending invites (`status='pending' AND expiresAt >
 * now`), matched by the invitation's `userId`. Surfacing is NOT
 * verification-gated (the verified check applies when the user ACTS on an
 * invite — accept or decline).
 */
export async function fetchMyWorkspaceInvites(
  client: SublayHttpClient,
  data: FetchMyWorkspaceInvitesProps
): Promise<FetchMyWorkspaceInvitesResponse> {
  const { actingUserId } = data;
  const response = await client.projectInstance.get<FetchMyWorkspaceInvitesResponse>(
    "/me/workspace-invites",
    { params: { actingUserId } }
  );
  return response.data;
}
