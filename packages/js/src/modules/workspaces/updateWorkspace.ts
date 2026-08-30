import { SublayHttpClient } from "../../core/client";
import { Workspace } from "../../interfaces/Workspace";

export interface UpdateWorkspaceProps {
  workspaceId: string;
  name?: string;
  metadata?: Record<string, any>;
}

/**
 * Edit a workspace's name / metadata. Requires the `edit-workspace` capability
 * (or ownership). The actor is the bearer-token user — no actor field is sent.
 */
export async function updateWorkspace(
  client: SublayHttpClient,
  data: UpdateWorkspaceProps
): Promise<Workspace> {
  const { workspaceId, ...body } = data;

  const response = await client.projectInstance.patch<Workspace>(
    `/workspaces/${workspaceId}`,
    body
  );
  return response.data;
}
