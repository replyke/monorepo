import { SublayHttpClient } from "../../core/client";
import { WorkspaceMember } from "../../interfaces/Workspace";

export interface UpdateWorkspaceMemberProps {
  workspaceId: string;
  // The target member's user id (path param).
  targetUserId: string;
  // The acting user. Required for the service key (act-as-user). NOTE: this is
  // sent as `actingUserId` in the body — on this route the path `:userId`
  // addresses the target, and the body `actingUserId` addresses the actor.
  actingUserId: string;
  // Powerful fields (require `edit-member-access` + rank rules + no-escalation).
  capabilities?: string[];
  permissions?: string[];
  rank?: number;
  // Cosmetic fields (require `edit-member-profile`; own-title needs nothing).
  title?: string | null;
  metadata?: Record<string, any>;
}

export async function updateWorkspaceMember(
  client: SublayHttpClient,
  data: UpdateWorkspaceMemberProps
): Promise<WorkspaceMember> {
  const { workspaceId, targetUserId, ...body } = data;
  const response = await client.projectInstance.patch<WorkspaceMember>(
    `/workspaces/${workspaceId}/members/${targetUserId}`,
    body
  );
  return response.data;
}
