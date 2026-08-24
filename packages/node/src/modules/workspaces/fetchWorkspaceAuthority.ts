import { SublayHttpClient } from "../../core/client";
import { WorkspaceAuthority } from "../../interfaces/Workspace";

export interface FetchWorkspaceAuthorityProps {
  workspaceId: string;
  // The acting user whose resolved standing to read (the service-key
  // `?actingUserId=` variant); required here.
  actingUserId: string;
}

/**
 * Authority-as-a-service read — the resolved standing
 * (`{ reasons, capabilities, permissions, rank }`) for the given user on the
 * workspace. A permission check is a one-line `.includes()` on the result;
 * Sublay never consumes the developer's opaque permissions.
 */
export async function fetchWorkspaceAuthority(
  client: SublayHttpClient,
  data: FetchWorkspaceAuthorityProps
): Promise<WorkspaceAuthority> {
  const { workspaceId, actingUserId } = data;
  const response = await client.projectInstance.get<WorkspaceAuthority>(
    `/workspaces/${workspaceId}/authority/me`,
    { params: { actingUserId } }
  );
  return response.data;
}
