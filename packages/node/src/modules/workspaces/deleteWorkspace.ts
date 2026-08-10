import { SublayHttpClient } from "../../core/client";

export interface DeleteWorkspaceProps {
  workspaceId: string;
  // Owner-only delete; the acting user (own owner or an ancestor owner).
  userId: string;
}

export interface DeleteWorkspaceResponse {
  message: string;
}

export async function deleteWorkspace(
  client: SublayHttpClient,
  data: DeleteWorkspaceProps
): Promise<DeleteWorkspaceResponse> {
  const { workspaceId, userId } = data;
  // The owner guard resolves the acting user from the body (or query); send it
  // in the request body so the service-key act-as-user path works on DELETE.
  const response = await client.projectInstance.delete<DeleteWorkspaceResponse>(
    `/workspaces/${workspaceId}`,
    { data: { userId } }
  );
  return response.data;
}
