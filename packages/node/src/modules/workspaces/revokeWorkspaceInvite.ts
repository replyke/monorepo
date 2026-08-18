import { SublayHttpClient } from "../../core/client";

export interface RevokeWorkspaceInviteProps {
  workspaceId: string;
  inviteId: string;
}

export interface RevokeWorkspaceInviteResponse {
  success: boolean;
}

/** Revoke a pending invitation. Requires the `invite` capability (or owner). */
export async function revokeWorkspaceInvite(
  client: SublayHttpClient,
  data: RevokeWorkspaceInviteProps
): Promise<RevokeWorkspaceInviteResponse> {
  const { workspaceId, inviteId } = data;
  const response = await client.projectInstance.post<RevokeWorkspaceInviteResponse>(
    `/workspaces/${workspaceId}/invites/${inviteId}/revoke`,
    {}
  );
  return response.data;
}
