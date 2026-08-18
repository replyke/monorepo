import { SublayHttpClient } from "../../core/client";
import { RemoveWorkspaceMemberFromSubtreeResponse } from "../../interfaces/Workspace";

export interface RemoveWorkspaceMemberFromSubtreeProps {
  workspaceId: string;
  // The user to offboard from this node and every descendant (path param).
  targetUserId: string;
  // The acting user (requires `remove-member`, rank-bounded per node). Required
  // for the service key (act-as-user).
  userId: string;
}

/**
 * Removes the target user's direct memberships on this workspace and every
 * descendant. Blocks (409 `workspace/owns-descendants`) with a report if the
 * user OWNS any descendant workspace — transfer or delete those first.
 *
 * The response also carries `skippedCount` / `skipped` (memberships the sweep
 * could NOT reach). A service key reaches the whole subtree, so these are `0` /
 * `[]` here — but assert on them rather than reading `removedCount` alone.
 */
export async function removeWorkspaceMemberFromSubtree(
  client: SublayHttpClient,
  data: RemoveWorkspaceMemberFromSubtreeProps
): Promise<RemoveWorkspaceMemberFromSubtreeResponse> {
  const { workspaceId, targetUserId, userId } = data;
  const response =
    await client.projectInstance.post<RemoveWorkspaceMemberFromSubtreeResponse>(
      `/workspaces/${workspaceId}/members/${targetUserId}/remove-from-subtree`,
      { userId }
    );
  return response.data;
}
