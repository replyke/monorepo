import { SublayHttpClient } from "../../core/client";
import { Workspace } from "../../interfaces/Workspace";
import { PaginatedResponse } from "../../interfaces/IPaginatedResponse";

export interface FetchManyWorkspacesProps {
  // The user whose direct-membership + owned workspaces to list. Required for
  // the service key (act-as-user).
  actingUserId: string;
  page?: number;
  limit?: number;
  // Comma-separated include flags. `memberCount` adds each row's DIRECT member
  // count — resolved in one grouped query over the page that was returned, so a
  // switcher UI does not need a follow-up read per workspace. Omit it and the
  // field is absent from every row. An unrecognized flag is ignored.
  include?: string;
}

/**
 * List a user's direct-membership + owned workspaces.
 *
 * ⚠️ Only the fields declared above are accepted. The workspaces endpoints
 * refuse any undeclared top-level field with a 400 rather than ignoring it, so
 * do not spread an unrelated object into `data`.
 */
export async function fetchManyWorkspaces(
  client: SublayHttpClient,
  data: FetchManyWorkspacesProps
): Promise<PaginatedResponse<Workspace>> {
  const response = await client.projectInstance.get<
    PaginatedResponse<Workspace>
  >("/workspaces", { params: data });
  return response.data;
}
