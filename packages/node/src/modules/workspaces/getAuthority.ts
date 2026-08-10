import { SublayHttpClient } from "../../core/client";
import { WorkspaceAuthority } from "../../interfaces/Workspace";

export interface GetAuthorityProps {
  workspaceId: string;
  // The user whose resolved standing to read. With a service key this is the
  // target user (the service-key `userId` variant); required here.
  userId: string;
}

/**
 * Authority-as-a-service read — the resolved standing
 * (`{ reasons, capabilities, permissions, rank }`) for the given user on the
 * workspace. A permission check is a one-line `.includes()` on the result;
 * Sublay never consumes the developer's opaque permissions.
 */
export async function getAuthority(
  client: SublayHttpClient,
  data: GetAuthorityProps
): Promise<WorkspaceAuthority> {
  const { workspaceId, userId } = data;
  const response = await client.projectInstance.get<WorkspaceAuthority>(
    `/workspaces/${workspaceId}/authority/me`,
    { params: { userId } }
  );
  return response.data;
}
