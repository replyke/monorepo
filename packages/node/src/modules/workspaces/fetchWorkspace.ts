import { SublayHttpClient } from "../../core/client";
import { Workspace } from "../../interfaces/Workspace";

export interface FetchWorkspaceProps {
  workspaceId: string;
  // Comma-separated include flags. `memberCount` adds the workspace's DIRECT
  // member count to the response; omit it and the field is absent. The same
  // flag works on `fetchManyWorkspaces`. An unrecognized flag is ignored.
  include?: string;
  // Act as a named user (service/master key only). Naming one means being BOUND
  // by that user — this call resolves and is checked against THEIR authority,
  // exactly as their own token would be. Omit it to act as the app itself
  // (unbounded). A user token may only name itself.
  //
  // Here that means visibility resolves against them: a key acting as a user
  // with no relation to the workspace gets the same 404 that user would.
  actingUserId?: string;
}

export async function fetchWorkspace(
  client: SublayHttpClient,
  data: FetchWorkspaceProps
): Promise<Workspace> {
  const { workspaceId, ...params } = data;
  const response = await client.projectInstance.get<Workspace>(
    `/workspaces/${workspaceId}`,
    { params }
  );
  return response.data;
}
