import { SublayHttpClient } from "../../core/client";
import { Workspace } from "../../interfaces/Workspace";
import { PaginatedResponse } from "../../interfaces/IPaginatedResponse";

export interface FetchManyWorkspacesProps {
  // The user whose direct-membership + owned workspaces to list. Required for
  // the service key (act-as-user).
  userId: string;
  page?: number;
  limit?: number;
  include?: string;
}

export async function fetchManyWorkspaces(
  client: SublayHttpClient,
  data: FetchManyWorkspacesProps
): Promise<PaginatedResponse<Workspace>> {
  const response = await client.projectInstance.get<
    PaginatedResponse<Workspace>
  >("/workspaces", { params: data });
  return response.data;
}
