import { SublayHttpClient } from "../../core/client";

export interface LeaveWorkspaceProps {
  workspaceId: string;
}

/**
 * The bearer-token user leaves this workspace — removes THEIR OWN direct
 * membership on THIS node only (owning a child is unaffected). An owner cannot
 * leave (409 `workspace/sole-owner`) — transfer ownership or remove the
 * workspace first. No actor field is sent; the server derives the leaver from
 * the token.
 */
export async function leaveWorkspace(
  client: SublayHttpClient,
  data: LeaveWorkspaceProps
): Promise<void> {
  const { workspaceId } = data;
  await client.projectInstance.delete<void>(
    `/workspaces/${workspaceId}/members/me`
  );
}
