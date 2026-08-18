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
 */
export async function fetchWorkspaceMembers(
  client: SublayHttpClient,
  data: FetchWorkspaceMembersProps
): Promise<WorkspaceRosterResponse | WorkspaceRosterCountsResponse> {
  const { workspaceId, ...rest } = data;

  // Client SDKs never send an actor `userId` — acting on behalf of another
  // user is the node-sdk service-key capability. Strip it defensively in
  // case a caller casts around the props type.
  const params: Record<string, any> = { ...rest };
  delete params.userId;

  const response = await client.projectInstance.get<
    WorkspaceRosterResponse | WorkspaceRosterCountsResponse
  >(`/workspaces/${workspaceId}/members`, { params });
  return response.data;
}
