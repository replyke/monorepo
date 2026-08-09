import { SublayHttpClient } from "../../core/client";

export interface AcceptInviteProps {
  inviteId: string;
  // The accepting user (must BE the invite's target; must have a verified
  // email). Required for the service key (act-as-user).
  userId: string;
}

export interface AcceptInviteResponse {
  success: boolean;
  workspaceId: string;
}

/**
 * Accept an invitation — identity-matched + verified-email, non-secret id.
 * Idempotent: if the user is already a member/owner, marks `accepted` with no
 * duplicate row.
 */
export async function acceptInvite(
  client: SublayHttpClient,
  data: AcceptInviteProps
): Promise<AcceptInviteResponse> {
  const { inviteId, userId } = data;
  const response = await client.projectInstance.post<AcceptInviteResponse>(
    `/workspace-invites/${inviteId}/accept`,
    { userId }
  );
  return response.data;
}
