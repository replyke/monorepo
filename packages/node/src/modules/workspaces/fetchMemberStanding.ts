import { SublayHttpClient } from "../../core/client";
import { WorkspaceMemberStanding } from "../../interfaces/Workspace";

export interface FetchMemberStandingProps {
  workspaceId: string;
  // The target user whose standing to read (path param).
  targetUserId: string;
}

export async function fetchMemberStanding(
  client: SublayHttpClient,
  data: FetchMemberStandingProps
): Promise<WorkspaceMemberStanding> {
  const { workspaceId, targetUserId } = data;
  const response =
    await client.projectInstance.get<WorkspaceMemberStanding>(
      `/workspaces/${workspaceId}/members/${targetUserId}`
    );
  return response.data;
}
