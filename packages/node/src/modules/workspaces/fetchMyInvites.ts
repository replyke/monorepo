import { SublayHttpClient } from "../../core/client";
import { WorkspaceInvitation } from "../../interfaces/Workspace";

export interface FetchMyInvitesProps {
  // The user whose live pending invites to read (matched by `userId`). Required
  // for the service key (act-as-user).
  userId: string;
}

export interface FetchMyInvitesResponse {
  data: WorkspaceInvitation[];
}

/**
 * The user's LIVE pending invites (`status='pending' AND expiresAt > now`),
 * matched by `userId`. Surfacing is NOT verification-gated (the verified check
 * applies only at accept).
 */
export async function fetchMyInvites(
  client: SublayHttpClient,
  data: FetchMyInvitesProps
): Promise<FetchMyInvitesResponse> {
  const { userId } = data;
  const response = await client.projectInstance.get<FetchMyInvitesResponse>(
    "/me/workspace-invites",
    { params: { userId } }
  );
  return response.data;
}
