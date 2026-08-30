import { SublayHttpClient } from "../../core/client";
import { MyWorkspaceInvitation } from "../../interfaces/Workspace";

export interface FetchMyWorkspaceInvitesResponse {
  data: MyWorkspaceInvitation[];
}

/**
 * The bearer-token user's LIVE pending invites (`status='pending' AND expiresAt
 * > now`), matched by `userId` from the token. Surfacing is NOT
 * verification-gated (the verified check applies when the user ACTS on an
 * invite — accept or decline).
 *
 * This is the INBOX read — invites addressed TO the caller. For the invites a
 * workspace has ISSUED, use `fetchWorkspaceInvites`.
 */
export async function fetchMyWorkspaceInvites(
  client: SublayHttpClient
): Promise<FetchMyWorkspaceInvitesResponse> {
  const response =
    await client.projectInstance.get<FetchMyWorkspaceInvitesResponse>(
      "/me/workspace-invites"
    );
  return response.data;
}
