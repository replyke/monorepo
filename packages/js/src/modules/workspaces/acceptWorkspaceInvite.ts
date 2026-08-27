import { SublayHttpClient } from "../../core/client";

export interface AcceptWorkspaceInviteProps {
  inviteId: string;
}

export interface AcceptWorkspaceInviteResponse {
  success: boolean;
  workspaceId: string;
}

/**
 * Accept an invitation — identity-matched to the bearer-token user + verified
 * email required. Non-secret id. Idempotent when already a member/owner.
 */
export async function acceptWorkspaceInvite(
  client: SublayHttpClient,
  data: AcceptWorkspaceInviteProps
): Promise<AcceptWorkspaceInviteResponse> {
  const { inviteId } = data;
  const response =
    await client.projectInstance.post<AcceptWorkspaceInviteResponse>(
      `/workspace-invites/${inviteId}/accept`,
      {}
    );
  return response.data;
}
