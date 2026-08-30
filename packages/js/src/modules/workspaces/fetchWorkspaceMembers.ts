import { SublayHttpClient } from "../../core/client";
import {
  WorkspaceRosterResponse,
  WorkspaceRosterCountsResponse,
} from "../../interfaces/Workspace";

export interface FetchWorkspaceMembersProps {
  workspaceId: string;
  // Comma-separated add-on buckets: `ancestorOwners`, `reachHolders`,
  // `descendants`. Default returns owner + direct members only.
  include?: string;
  // Numbers-only escape hatch — per-reason counts + distinct-user total.
  countOnly?: boolean;
}

/**
 * Unified roster read — one entry per distinct user, each with a `reasons`
 * array. Always returned in full (never paginated). With `countOnly=true` the
 * shape is `WorkspaceRosterCountsResponse` instead. Actor from the token.
 *
 * Same-node `member` reasons carry both rank coordinates: absolute `rank` and
 * `relativeRank`, the offset from you (`1` = one rung below you, `-3` = three
 * above). Both are fenced together and both are absent for a caller who does
 * not operate people here. `descendant-member` reasons carry `rank` only.
 */
export async function fetchWorkspaceMembers(
  client: SublayHttpClient,
  data: FetchWorkspaceMembersProps
): Promise<WorkspaceRosterResponse | WorkspaceRosterCountsResponse> {
  const { workspaceId, ...params } = data;

  const response = await client.projectInstance.get<
    WorkspaceRosterResponse | WorkspaceRosterCountsResponse
  >(`/workspaces/${workspaceId}/members`, { params });
  return response.data;
}
