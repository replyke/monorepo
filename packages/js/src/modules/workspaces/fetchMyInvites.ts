import { SublayHttpClient } from "../../core/client";
import { WorkspaceInvitation } from "../../interfaces/Workspace";

export interface FetchMyInvitesResponse {
  data: WorkspaceInvitation[];
}

/**
 * The bearer-token user's LIVE pending invites (`status='pending' AND expiresAt
 * > now`), matched by `userId` from the token. Surfacing is NOT
 * verification-gated (the verified check applies only at accept).
 */
export async function fetchMyInvites(
  client: SublayHttpClient
): Promise<FetchMyInvitesResponse> {
  const response = await client.projectInstance.get<FetchMyInvitesResponse>(
    "/me/workspace-invites"
  );
  return response.data;
}
