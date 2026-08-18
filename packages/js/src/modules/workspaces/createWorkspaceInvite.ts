import { SublayHttpClient } from "../../core/client";
import {
  WorkspaceCapability,
  WorkspaceInvitation,
} from "../../interfaces/Workspace";

export interface CreateWorkspaceInviteProps {
  workspaceId: string;
  // Address the invitee by exactly one of: `email`, `userId`, or `username`.
  // (Here `userId` is the INVITE TARGET, not the actor — the inviter is the
  // bearer-token user.)
  email?: string;
  userId?: string;
  username?: string;
  capabilities?: WorkspaceCapability[];
  permissions?: string[];
  rank: number;
  title?: string | null;
}

/**
 * Create an invitation (requires the `invite` capability on the workspace). The
 * inviter is the bearer-token user.
 */
export async function createWorkspaceInvite(
  client: SublayHttpClient,
  data: CreateWorkspaceInviteProps
): Promise<WorkspaceInvitation> {
  const { workspaceId, ...body } = data;
  const response = await client.projectInstance.post<WorkspaceInvitation>(
    `/workspaces/${workspaceId}/invites`,
    body
  );
  return response.data;
}
