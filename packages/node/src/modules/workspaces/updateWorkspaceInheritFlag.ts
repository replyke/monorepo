import { SublayHttpClient } from "../../core/client";
import { Workspace } from "../../interfaces/Workspace";

export interface UpdateWorkspaceInheritFlagProps {
  workspaceId: string;
  // Owner-only flip; the acting user (must be own owner or an ancestor owner).
  actingUserId: string;
  inheritsFromParent: boolean;
}

export async function updateWorkspaceInheritFlag(
  client: SublayHttpClient,
  data: UpdateWorkspaceInheritFlagProps
): Promise<Workspace> {
  const { workspaceId, actingUserId, inheritsFromParent } = data;
  const response = await client.projectInstance.patch<Workspace>(
    `/workspaces/${workspaceId}/inherit-flag`,
    { actingUserId, inheritsFromParent }
  );
  return response.data;
}
