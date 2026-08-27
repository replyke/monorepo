import { SublayHttpClient } from "../../core/client";

export interface RemoveWorkspaceMemberProps {
  workspaceId: string;
  // The member to remove (path param — the TARGET, not the actor).
  targetUserId: string;
}

/**
 * Remove a member from this workspace. Requires the `remove-member` capability
 * and is rank-bounded. The workspace owner cannot be removed (409
 * `workspace/sole-owner`) — transfer ownership first. No actor field is sent;
 * the actor comes from the token.
 */
export async function removeWorkspaceMember(
  client: SublayHttpClient,
  data: RemoveWorkspaceMemberProps
): Promise<void> {
  const { workspaceId, targetUserId } = data;
  await client.projectInstance.delete<void>(
    `/workspaces/${workspaceId}/members/${targetUserId}`
  );
}
