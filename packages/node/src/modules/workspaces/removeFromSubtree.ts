import { SublayHttpClient } from "../../core/client";
import { RemoveFromSubtreeResponse } from "../../interfaces/Workspace";

export interface RemoveFromSubtreeProps {
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
 */
export async function removeFromSubtree(
  client: SublayHttpClient,
  data: RemoveFromSubtreeProps
): Promise<RemoveFromSubtreeResponse> {
  const { workspaceId, targetUserId, userId } = data;
  const response =
    await client.projectInstance.post<RemoveFromSubtreeResponse>(
      `/workspaces/${workspaceId}/members/${targetUserId}/remove-from-subtree`,
      { userId }
    );
  return response.data;
}
