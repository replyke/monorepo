import { SublayHttpClient } from "../../core/client";

export interface DeleteWorkspaceProps {
  workspaceId: string;
}

export interface DeleteWorkspaceResponse {
  message: string;
}

/**
 * Owner-only delete (own owner or an ancestor owner). Cascades the whole
 * subtree transactionally. The actor is the bearer-token user — no `userId`
 * body is sent.
 */
export async function deleteWorkspace(
  client: SublayHttpClient,
  data: DeleteWorkspaceProps
): Promise<DeleteWorkspaceResponse> {
  const { workspaceId } = data;
  const response = await client.projectInstance.delete<DeleteWorkspaceResponse>(
    `/workspaces/${workspaceId}`
  );
  return response.data;
}
