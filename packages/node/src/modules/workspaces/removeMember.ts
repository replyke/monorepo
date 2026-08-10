import { SublayHttpClient } from "../../core/client";

export interface RemoveMemberProps {
  workspaceId: string;
  // The member to remove (path param).
  targetUserId: string;
  // The acting user (requires `remove-member`, rank-bounded). Required for the
  // service key (act-as-user).
  userId: string;
}

export async function removeMember(
  client: SublayHttpClient,
  data: RemoveMemberProps
): Promise<void> {
  const { workspaceId, targetUserId, userId } = data;
  // The controller resolves the acting user from the request body; send it there
  // so the service-key act-as-user path works on DELETE.
  await client.projectInstance.delete<void>(
    `/workspaces/${workspaceId}/members/${targetUserId}`,
    { data: { userId } }
  );
}
