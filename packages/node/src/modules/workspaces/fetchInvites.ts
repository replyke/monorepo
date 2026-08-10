import { SublayHttpClient } from "../../core/client";
import { WorkspaceInvitation } from "../../interfaces/Workspace";

export interface FetchInvitesProps {
  workspaceId: string;
}

export interface FetchInvitesResponse {
  data: WorkspaceInvitation[];
}

/**
 * List a workspace's LIVE pending invites (`status='pending' AND expiresAt >
 * now`). Requires the `invite` capability (or owner).
 */
export async function fetchInvites(
  client: SublayHttpClient,
  data: FetchInvitesProps
): Promise<FetchInvitesResponse> {
  const { workspaceId } = data;
  const response = await client.projectInstance.get<FetchInvitesResponse>(
    `/workspaces/${workspaceId}/invites`
  );
  return response.data;
}
