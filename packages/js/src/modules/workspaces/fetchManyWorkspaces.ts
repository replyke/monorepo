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
 * is derived from the token — no `userId` is sent.
 */
export async function fetchManyWorkspaces(
  client: SublayHttpClient,
  data: FetchManyWorkspacesProps = {}
): Promise<PaginatedResponse<Workspace>> {
  // Client SDKs never send an actor `userId` — acting on behalf of another
  // user is the node-sdk service-key capability. Strip it defensively in
  // case a caller casts around the props type.
  const params: Record<string, any> = { ...data };
  delete params.userId;

  const response = await client.projectInstance.get<
    PaginatedResponse<Workspace>
  >("/workspaces", { params });
  return response.data;
}
