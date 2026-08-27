import { SublayHttpClient } from "../../core/client";

export interface DeclineWorkspaceInviteProps {
  inviteId: string;
}

export interface DeclineWorkspaceInviteResponse {
  success: boolean;
}

/**
 * Decline an invitation — identity-matched to the bearer-token user, and
 * verified-email-gated (the same gate as accept, so an unverified squatter on
 * someone else's address cannot burn their invite). An unverified decline
 * returns `403 workspace/email-not-verified`.
 */
export async function declineWorkspaceInvite(
  client: SublayHttpClient,
  data: DeclineWorkspaceInviteProps
): Promise<DeclineWorkspaceInviteResponse> {
  const { inviteId } = data;
  const response =
    await client.projectInstance.post<DeclineWorkspaceInviteResponse>(
      `/workspace-invites/${inviteId}/decline`,
      {}
    );
  return response.data;
}
