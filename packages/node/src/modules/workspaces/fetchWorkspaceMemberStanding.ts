import { SublayHttpClient } from "../../core/client";
import { WorkspaceMemberStanding } from "../../interfaces/Workspace";

export interface FetchWorkspaceMemberStandingProps {
  workspaceId: string;
  // The target user whose standing to read (path param).
  targetUserId: string;
  // Act as a named user (service/master key only). Naming one means being BOUND
  // by that user — this call resolves and is checked against THEIR authority,
  // exactly as their own token would be. Omit it to act as the app itself
  // (unbounded). A user token may only name itself.
  //
  // Here that means the same authority-field fence as the roster read: a key
  // acting as a member who does not operate people (and is not asking about
  // themselves) receives the standing WITHOUT
  // `rank`/`capabilities`/`permissions`.
  actingUserId?: string;
}

export async function fetchWorkspaceMemberStanding(
  client: SublayHttpClient,
  data: FetchWorkspaceMemberStandingProps
): Promise<WorkspaceMemberStanding> {
  const { workspaceId, targetUserId, ...params } = data;
  const response =
    await client.projectInstance.get<WorkspaceMemberStanding>(
      `/workspaces/${workspaceId}/members/${targetUserId}`,
      { params }
    );
  return response.data;
}
