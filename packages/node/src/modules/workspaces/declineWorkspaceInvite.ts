import { SublayHttpClient } from "../../core/client";

export interface DeclineWorkspaceInviteProps {
  inviteId: string;
  // The declining user (must BE the invite's target, and must be verified —
  // a service key does NOT bypass the verified-email gate).
  // Required for the service key (act-as-user).
  userId: string;
}

export interface DeclineWorkspaceInviteResponse {
  success: boolean;
}

/** Decline an invitation — identity-matched + verified-email-gated (same as accept). */
export async function declineWorkspaceInvite(
  client: SublayHttpClient,
  data: DeclineWorkspaceInviteProps
): Promise<DeclineWorkspaceInviteResponse> {
  const { inviteId, userId } = data;
  const response = await client.projectInstance.post<DeclineWorkspaceInviteResponse>(
    `/workspace-invites/${inviteId}/decline`,
    { userId }
  );
  return response.data;
}
