import { SublayHttpClient } from "../../core/client";
import { WorkspaceMemberStanding } from "../../interfaces/Workspace";

export interface FetchWorkspaceMemberStandingProps {
  workspaceId: string;
  // The TARGET user whose standing to read (path param — not the actor; the
  // actor is always the bearer-token user).
  targetUserId: string;
}

/**
 * Read one user's resolved standing on a workspace (`reasons`, `capabilities`,
 * `permissions`, `rank`, `relativeRank`, `title`, `metadata`).
 *
 * `relativeRank` is the target's `rank` as an offset from YOU (negative =
 * senior to you), and is fenced with `rank`: both are absent, not null, for a
 * caller who may not see the target's authority.
 */
export async function fetchWorkspaceMemberStanding(
  client: SublayHttpClient,
  data: FetchWorkspaceMemberStandingProps
): Promise<WorkspaceMemberStanding> {
  const { workspaceId, targetUserId } = data;
  const response = await client.projectInstance.get<WorkspaceMemberStanding>(
    `/workspaces/${workspaceId}/members/${targetUserId}`
  );
  return response.data;
}
