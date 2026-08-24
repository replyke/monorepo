import { SublayHttpClient } from "../../core/client";
import { WorkspaceInvitation } from "../../interfaces/Workspace";

export interface CreateWorkspaceInviteProps {
  workspaceId: string;
  // Address the invitee by exactly one of: `email`, `userId`, or `username`.
  // (Here `userId` is the INVITE TARGET, never the actor — the inviter is the
  // token subject, or `actingUserId` below for a service/master key.)
  email?: string;
  userId?: string;
  username?: string;
  capabilities?: string[];
  permissions?: string[];
  rank: number;
  title?: string | null;
  // The INVITER, when a service/master key invites on a user's behalf
  // (service/master key only). Naming one means being BOUND by that user: the
  // invited grant is floored by THEIR capabilities/permissions, and the invited
  // rank must be strictly below theirs. Omit it to invite as the app itself
  // (unbounded, and `invitedBy` falls back to the workspace owner). A user
  // token may only name itself.
  //
  // ⚠️ Distinct from `userId` above, which addresses the INVITEE.
  actingUserId?: string;
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
