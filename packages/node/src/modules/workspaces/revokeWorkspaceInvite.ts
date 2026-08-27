import { SublayHttpClient } from "../../core/client";

export interface RevokeWorkspaceInviteProps {
  workspaceId: string;
  inviteId: string;
  // Act as a named user (service/master key only). Naming one means being BOUND
  // by that user — this call resolves and is checked against THEIR authority,
  // exactly as their own token would be. Omit it to act as the app itself
  // (unbounded). A user token may only name itself.
  //
  // Here that means the `invite` capability is required OF THEM: a key acting
  // as a user without it gets the same 403 that user would.
  actingUserId?: string;
}

export interface RevokeWorkspaceInviteResponse {
  success: boolean;
}

/** Revoke a pending invitation. Requires the `invite` capability (or owner). */
export async function revokeWorkspaceInvite(
  client: SublayHttpClient,
  data: RevokeWorkspaceInviteProps
): Promise<RevokeWorkspaceInviteResponse> {
  const { workspaceId, inviteId, ...body } = data;
  const response = await client.projectInstance.post<RevokeWorkspaceInviteResponse>(
    `/workspaces/${workspaceId}/invites/${inviteId}/revoke`,
    body
  );
  return response.data;
}
