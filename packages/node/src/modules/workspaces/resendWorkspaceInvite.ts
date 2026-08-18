import { SublayHttpClient } from "../../core/client";
import { WorkspaceInvitation } from "../../interfaces/Workspace";

export interface ResendWorkspaceInviteProps {
  workspaceId: string;
  inviteId: string;
}

/**
 * Resend / refresh a pending invitation (valid on any `pending` invite, even one
 * past `expiresAt` — resets a 14-day expiry and resends the email). A terminal
 * invite (accepted/declined/revoked) → 409. Requires `invite` (or owner).
 */
export async function resendWorkspaceInvite(
  client: SublayHttpClient,
  data: ResendWorkspaceInviteProps
): Promise<WorkspaceInvitation> {
  const { workspaceId, inviteId } = data;
  const response = await client.projectInstance.post<WorkspaceInvitation>(
    `/workspaces/${workspaceId}/invites/${inviteId}/resend`,
    {}
  );
  return response.data;
}
