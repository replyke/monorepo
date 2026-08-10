import { SublayHttpClient } from "../../core/client";

export interface DeclineInviteProps {
  inviteId: string;
}

export interface DeclineInviteResponse {
  success: boolean;
}

/**
 * Decline an invitation — identity-matched to the bearer-token user (not
 * verification-gated).
 */
export async function declineInvite(
  client: SublayHttpClient,
  data: DeclineInviteProps
): Promise<DeclineInviteResponse> {
  const { inviteId } = data;
  const response = await client.projectInstance.post<DeclineInviteResponse>(
    `/workspace-invites/${inviteId}/decline`,
    {}
  );
  return response.data;
}
