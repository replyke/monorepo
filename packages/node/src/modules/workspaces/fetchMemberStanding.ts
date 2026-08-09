import { SublayHttpClient } from "../../core/client";
import { WorkspaceMemberStanding } from "../../interfaces/Workspace";

export interface FetchMemberStandingProps {
  workspaceId: string;
  // The target user whose standing to read (path param).
  targetUserId: string;
  // The acting user (must have roster visibility). Required for the service key.
  userId: string;
}

export async function fetchMemberStanding(
  client: SublayHttpClient,
  data: FetchMemberStandingProps
): Promise<WorkspaceMemberStanding> {
  const { workspaceId, targetUserId, userId } = data;
  const response =
    await client.projectInstance.get<WorkspaceMemberStanding>(
      `/workspaces/${workspaceId}/members/${targetUserId}`,
      { params: { userId } }
    );
  return response.data;
}
