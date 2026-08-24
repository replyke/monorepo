import { SublayHttpClient } from "../../core/client";
import { WorkspaceInvitation } from "../../interfaces/Workspace";

export interface FetchWorkspaceInvitesProps {
  workspaceId: string;
  // Act as a named user (service/master key only). Naming one means being BOUND
  // by that user — this call resolves and is checked against THEIR authority,
  // exactly as their own token would be. Omit it to act as the app itself
  // (unbounded). A user token may only name itself.
  //
  // Here that means the `invite` capability is required OF THEM: a key acting
  // as a user without it gets the same 403 that user would.
  actingUserId?: string;
}

export interface FetchWorkspaceInvitesResponse {
  data: WorkspaceInvitation[];
}

/**
 * List a workspace's LIVE pending invites (`status='pending' AND expiresAt >
 * now`). Requires the `invite` capability (or owner).
 */
export async function fetchWorkspaceInvites(
  client: SublayHttpClient,
  data: FetchWorkspaceInvitesProps
): Promise<FetchWorkspaceInvitesResponse> {
  const { workspaceId, ...params } = data;
  const response = await client.projectInstance.get<FetchWorkspaceInvitesResponse>(
    `/workspaces/${workspaceId}/invites`,
    { params }
  );
  return response.data;
}
