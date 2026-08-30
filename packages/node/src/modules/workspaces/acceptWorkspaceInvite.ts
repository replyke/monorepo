import { SublayHttpClient } from "../../core/client";

export interface AcceptWorkspaceInviteProps {
  inviteId: string;
  // The accepting user (must BE the invite's target; must have a verified
  // email). Required for the service key (act-as-user).
  actingUserId: string;
}

export interface AcceptWorkspaceInviteResponse {
  success: boolean;
  workspaceId: string;
}

/**
 * Accept an invitation — identity-matched + verified-email, non-secret id.
 * Idempotent: if the user is already a member/owner, marks `accepted` with no
 * duplicate row.
 */
export async function acceptWorkspaceInvite(
  client: SublayHttpClient,
  data: AcceptWorkspaceInviteProps
): Promise<AcceptWorkspaceInviteResponse> {
  const { inviteId, actingUserId } = data;
  const response = await client.projectInstance.post<AcceptWorkspaceInviteResponse>(
    `/workspace-invites/${inviteId}/accept`,
    { actingUserId }
  );
  return response.data;
}
