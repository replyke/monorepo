import { SublayHttpClient } from "../../core/client";
import { Workspace } from "../../interfaces/Workspace";

export interface UpdateInheritFlagProps {
  workspaceId: string;
  // Owner-only flip; the acting user (must be own owner or an ancestor owner).
  userId: string;
  inheritsFromParent: boolean;
}

export async function updateInheritFlag(
  client: SublayHttpClient,
  data: UpdateInheritFlagProps
): Promise<Workspace> {
  const { workspaceId, userId, inheritsFromParent } = data;
  const response = await client.projectInstance.patch<Workspace>(
    `/workspaces/${workspaceId}/inherit-flag`,
    { userId, inheritsFromParent }
  );
  return response.data;
}
