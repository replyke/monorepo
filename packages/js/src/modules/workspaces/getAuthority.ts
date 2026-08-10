import { SublayHttpClient } from "../../core/client";
import { WorkspaceAuthority } from "../../interfaces/Workspace";

export interface GetAuthorityProps {
  workspaceId: string;
}

/**
 * Authority-as-a-service read — the bearer-token user's resolved standing
 * (`{ reasons, capabilities, permissions, rank }`) on the workspace. A
 * permission check is a one-line `.includes()` on the result.
 */
export async function getAuthority(
  client: SublayHttpClient,
  data: GetAuthorityProps
): Promise<WorkspaceAuthority> {
  const { workspaceId } = data;
  const response = await client.projectInstance.get<WorkspaceAuthority>(
    `/workspaces/${workspaceId}/authority/me`
  );
  return response.data;
}
