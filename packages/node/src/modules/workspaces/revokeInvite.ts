import { SublayHttpClient } from "../../core/client";

export interface RevokeInviteProps {
  workspaceId: string;
  inviteId: string;
}

export interface RevokeInviteResponse {
  success: boolean;
}

/** Revoke a pending invitation. Requires the `invite` capability (or owner). */
export async function revokeInvite(
  client: SublayHttpClient,
  data: RevokeInviteProps
): Promise<RevokeInviteResponse> {
  const { workspaceId, inviteId } = data;
  const response = await client.projectInstance.post<RevokeInviteResponse>(
    `/workspaces/${workspaceId}/invites/${inviteId}/revoke`,
    {}
  );
  return response.data;
}
