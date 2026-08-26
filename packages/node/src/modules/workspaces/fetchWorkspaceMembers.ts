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
  // Numbers-only escape hatch — returns per-reason counts + distinct-user total.
  countOnly?: boolean;
  // Act as a named user (service/master key only). Naming one means being BOUND
  // by that user — this call resolves and is checked against THEIR authority,
  // exactly as their own token would be. Omit it to act as the app itself
  // (unbounded). A user token may only name itself.
  //
  // Here that means the roster's authority-field fence evaluates against them:
  // a key acting as a member who does not operate people receives entries
  // WITHOUT `rank`/`relativeRank`/`capabilities`/`permissions` for other users.
  actingUserId?: string;
}

/**
 * Unified roster read — one entry per distinct user, each with a `reasons`
 * array. Always returned in full (never paginated). With `countOnly=true` the
 * shape is `WorkspaceRosterCountsResponse` instead.
 *
 * Same-node `member` reasons carry both rank coordinates: absolute `rank` and
 * `relativeRank`, the offset from the CALLER (the acting user when one is
 * named): `1` = one rung below them, `-3` = three above. Both are fenced
 * together and both are absent for a caller who does not operate people here.
 * `descendant-member` reasons carry `rank` only — those ranks belong to another
 * node's ladder.
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
