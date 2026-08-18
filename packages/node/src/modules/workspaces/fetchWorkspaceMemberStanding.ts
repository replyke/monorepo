import { SublayHttpClient } from "../../core/client";
import { WorkspaceMemberStanding } from "../../interfaces/Workspace";

export interface FetchWorkspaceMemberStandingProps {
  workspaceId: string;
  // The target user whose standing to read (path param).
  targetUserId: string;
}

export async function fetchWorkspaceMemberStanding(
  client: SublayHttpClient,
  data: FetchWorkspaceMemberStandingProps
): Promise<WorkspaceMemberStanding> {
  const { workspaceId, targetUserId } = data;
  const response =
    await client.projectInstance.get<WorkspaceMemberStanding>(
      `/workspaces/${workspaceId}/members/${targetUserId}`
    );
  return response.data;
}
