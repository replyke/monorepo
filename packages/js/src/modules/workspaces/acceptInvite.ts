import { SublayHttpClient } from "../../core/client";

export interface AcceptInviteProps {
  inviteId: string;
}

export interface AcceptInviteResponse {
  success: boolean;
  workspaceId: string;
}

/**
 * Accept an invitation — identity-matched to the bearer-token user + verified
 * email required. Non-secret id. Idempotent when already a member/owner.
 */
export async function acceptInvite(
  client: SublayHttpClient,
  data: AcceptInviteProps
): Promise<AcceptInviteResponse> {
  const { inviteId } = data;
  const response = await client.projectInstance.post<AcceptInviteResponse>(
    `/workspace-invites/${inviteId}/accept`,
    {}
  );
  return response.data;
}
