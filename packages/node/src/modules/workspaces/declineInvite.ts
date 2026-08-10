import { SublayHttpClient } from "../../core/client";

export interface DeclineInviteProps {
  inviteId: string;
  // The declining user (must BE the invite's target). Not verification-gated.
  // Required for the service key (act-as-user).
  userId: string;
}

export interface DeclineInviteResponse {
  success: boolean;
}

/** Decline an invitation — identity-matched (not verification-gated). */
export async function declineInvite(
  client: SublayHttpClient,
  data: DeclineInviteProps
): Promise<DeclineInviteResponse> {
  const { inviteId, userId } = data;
  const response = await client.projectInstance.post<DeclineInviteResponse>(
    `/workspace-invites/${inviteId}/decline`,
    { userId }
  );
  return response.data;
}
