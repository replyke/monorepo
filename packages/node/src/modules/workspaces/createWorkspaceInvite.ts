import { SublayHttpClient } from "../../core/client";
import { WorkspaceInvitation } from "../../interfaces/Workspace";

export interface CreateWorkspaceInviteProps {
  workspaceId: string;
  // Address the invitee by exactly one of: `email`, `userId`, or `username`.
  // (Here `userId` is the INVITE TARGET, not an acting user — the inviter is the
  // key/token subject.)
  email?: string;
  userId?: string;
  username?: string;
  capabilities?: string[];
  permissions?: string[];
  rank: number;
  title?: string | null;
}

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
