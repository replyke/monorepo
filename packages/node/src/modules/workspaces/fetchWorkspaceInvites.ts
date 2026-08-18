import { SublayHttpClient } from "../../core/client";
import { WorkspaceInvitation } from "../../interfaces/Workspace";

export interface FetchWorkspaceInvitesProps {
  workspaceId: string;
}

export interface FetchWorkspaceInvitesResponse {
  data: WorkspaceInvitation[];
}

/**
 * List a workspace's LIVE pending invites (`status='pending' AND expiresAt >
 * now`). Requires the `invite` capability (or owner).
 */
export async function fetchWorkspaceInvites(
  client: SublayHttpClient,
  data: FetchWorkspaceInvitesProps
): Promise<FetchWorkspaceInvitesResponse> {
  const { workspaceId } = data;
  const response = await client.projectInstance.get<FetchWorkspaceInvitesResponse>(
    `/workspaces/${workspaceId}/invites`
  );
  return response.data;
}
