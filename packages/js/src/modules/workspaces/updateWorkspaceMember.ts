import { SublayHttpClient } from "../../core/client";
import { WorkspaceCapability, WorkspaceMember } from "../../interfaces/Workspace";

export interface UpdateWorkspaceMemberProps {
  workspaceId: string;
  // The TARGET member's user id (path param — not the actor; the actor is
  // always the bearer-token user).
  targetUserId: string;
  // Powerful fields (require `edit-member-access` + rank rules + no-escalation).
  capabilities?: WorkspaceCapability[];
  permissions?: string[];
  rank?: number;
  // Cosmetic fields (require `edit-member-profile`; own-title needs nothing).
  title?: string | null;
  metadata?: Record<string, any>;
}

/**
 * Edit a member's grant / profile. Powerful fields need `edit-member-access`
 * plus rank + no-escalation rules; cosmetic fields need only
 * `edit-member-profile`. No `userId` is sent — the actor comes from the token.
 */
export async function updateWorkspaceMember(
  client: SublayHttpClient,
  data: UpdateWorkspaceMemberProps
): Promise<WorkspaceMember> {
  const { workspaceId, targetUserId, ...rest } = data;

  // On this route the server reads a body `userId` as the ACTOR (the
  // service-key act-as-user path). Client SDKs never send one — the actor is
  // always the bearer-token user — so strip it defensively.
  const body: Record<string, any> = { ...rest };
  delete body.userId;

  const response = await client.projectInstance.patch<WorkspaceMember>(
    `/workspaces/${workspaceId}/members/${targetUserId}`,
    body
  );
  return response.data;
}
