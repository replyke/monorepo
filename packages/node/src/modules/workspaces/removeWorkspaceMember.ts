import { SublayHttpClient } from "../../core/client";

export interface RemoveWorkspaceMemberProps {
  workspaceId: string;
  // The member to remove (path param).
  targetUserId: string;
  // The acting user (requires `remove-member`, rank-bounded). Required for the
  // service key (act-as-user).
  actingUserId: string;
}

export async function removeWorkspaceMember(
  client: SublayHttpClient,
  data: RemoveWorkspaceMemberProps
): Promise<void> {
  const { workspaceId, targetUserId, actingUserId } = data;
  // The controller resolves the acting user from the request body; send it there
  // so the service-key act-as-user path works on DELETE.
  await client.projectInstance.delete<void>(
    `/workspaces/${workspaceId}/members/${targetUserId}`,
    { data: { actingUserId } }
  );
}
