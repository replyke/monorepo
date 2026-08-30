import { SublayHttpClient } from "../../core/client";

export interface LeaveWorkspaceProps {
  workspaceId: string;
  // The user leaving this workspace. Required for the service key (act-as-user):
  // removes THIS user's direct membership on this node only.
  actingUserId: string;
}

export async function leaveWorkspace(
  client: SublayHttpClient,
  data: LeaveWorkspaceProps
): Promise<void> {
  const { workspaceId, actingUserId } = data;
  // The controller resolves the acting user from the request body; send it there
  // so the service-key act-as-user path works on DELETE.
  await client.projectInstance.delete<void>(
    `/workspaces/${workspaceId}/members/me`,
    { data: { actingUserId } }
  );
}
