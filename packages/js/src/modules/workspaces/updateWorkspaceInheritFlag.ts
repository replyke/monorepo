import { SublayHttpClient } from "../../core/client";
import { Workspace } from "../../interfaces/Workspace";

export interface UpdateWorkspaceInheritFlagProps {
  workspaceId: string;
  inheritsFromParent: boolean;
}

/**
 * Flip whether capabilities held on an ancestor "reach" into this workspace.
 * Owner-only in both directions (own owner or an ancestor owner), and blocked
 * (403 `workspace/inherit-enforced`) when the project enforces its default.
 * The actor is the bearer-token user — no `userId` is sent.
 */
export async function updateWorkspaceInheritFlag(
  client: SublayHttpClient,
  data: UpdateWorkspaceInheritFlagProps
): Promise<Workspace> {
  const { workspaceId, inheritsFromParent } = data;
  const response = await client.projectInstance.patch<Workspace>(
    `/workspaces/${workspaceId}/inherit-flag`,
    { inheritsFromParent }
  );
  return response.data;
}
