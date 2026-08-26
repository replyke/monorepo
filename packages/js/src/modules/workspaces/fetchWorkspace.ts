import { SublayHttpClient } from "../../core/client";
import { Workspace } from "../../interfaces/Workspace";

export interface FetchWorkspaceProps {
  workspaceId: string;
  // Comma-separated include flags. `memberCount` adds the workspace's DIRECT
  // member count to the response; omit it and the field is absent. The same
  // flag works on `fetchManyWorkspaces`. An unrecognized flag is ignored.
  include?: string;
}

export async function fetchWorkspace(
  client: SublayHttpClient,
  data: FetchWorkspaceProps
): Promise<Workspace> {
  const { workspaceId, include } = data;
  const response = await client.projectInstance.get<Workspace>(
    `/workspaces/${workspaceId}`,
    { params: include ? { include } : undefined }
  );
  return response.data;
}
