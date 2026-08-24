import { SublayHttpClient } from "../../core/client";
import { Workspace } from "../../interfaces/Workspace";
import { PaginatedResponse } from "../../interfaces/IPaginatedResponse";

export interface FetchManyWorkspacesProps {
  page?: number;
  limit?: number;
  include?: string;
}

/**
 * List the bearer-token user's direct-membership + owned workspaces. The actor
 * is derived from the token — no actor field is sent.
 */
export async function fetchManyWorkspaces(
  client: SublayHttpClient,
  data: FetchManyWorkspacesProps = {}
): Promise<PaginatedResponse<Workspace>> {
  const response = await client.projectInstance.get<
    PaginatedResponse<Workspace>
  >("/workspaces", { params: data });
  return response.data;
}
