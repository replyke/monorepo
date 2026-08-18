import { SublayHttpClient } from "../../core/client";
import { Workspace } from "../../interfaces/Workspace";

export interface UpdateWorkspaceProps {
  workspaceId: string;
  name?: string;
  metadata?: Record<string, any>;
}

/**
 * Edit a workspace's name / metadata. Requires the `edit-workspace` capability
 * (or ownership). The actor is the bearer-token user — no `userId` is sent.
 */
export async function updateWorkspace(
  client: SublayHttpClient,
  data: UpdateWorkspaceProps
): Promise<Workspace> {
  const { workspaceId, ...rest } = data;

  // Client SDKs never send an actor `userId` — acting on behalf of another
  // user is the node-sdk service-key capability. Strip it defensively in
  // case a caller casts around the props type.
  const body: Record<string, any> = { ...rest };
  delete body.userId;

  const response = await client.projectInstance.patch<Workspace>(
    `/workspaces/${workspaceId}`,
    body
  );
  return response.data;
}
