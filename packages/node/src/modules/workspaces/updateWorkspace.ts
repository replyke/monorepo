import { SublayHttpClient } from "../../core/client";
import { Workspace } from "../../interfaces/Workspace";

export interface UpdateWorkspaceProps {
  workspaceId: string;
  // The user the edit is performed as (subject to the edit-workspace capability
  // or ownership). Required for the service key (act-as-user).
  userId: string;
  name?: string;
  metadata?: Record<string, any>;
}

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
