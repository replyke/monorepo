import { SublayHttpClient } from "../../core/client";
import { Comment } from "../../interfaces/Comment";
import { PaginatedResponse } from "../../interfaces/IPaginatedResponse";
import { SpaceReputationContextParams } from "../../interfaces/SpaceReputation";
import { buildSpaceReputationParams } from "../../core/spaceReputationParams";

export interface FetchManyCommentsProps extends SpaceReputationContextParams {
  entityId?: string;
  userId?: string;
  parentId?: string;
  page?: number;
  limit?: number;
  sortBy?:
    | "createdAt"
    | "top"
    | "controversial"
    /** @deprecated Use "createdAt" instead. "new" is a directional alias for
     * createdAt DESC, removed in v8; the server still accepts it (identical
     * behavior) but responds with deprecation headers. */
    | "new"
    /** @deprecated Use "createdAt" with sortDir:"asc" instead. "old" is a
     * directional alias for createdAt ASC, removed in v8; the server still
     * accepts it (identical behavior) but responds with deprecation headers. */
    | "old";
  /** Sort direction for `sortBy: "createdAt"`. Defaults to "desc". */
  sortDir?: "asc" | "desc";
  include?: string;
  sourceId?: string;
}

export async function fetchManyComments(
  client: SublayHttpClient,
  data: FetchManyCommentsProps
): Promise<PaginatedResponse<Comment>> {
  const { spaceReputation, spaceReputationId, spaceReputationDescendants, ...rest } =
    data;
  const response = await client.projectInstance.get<PaginatedResponse<Comment>>(
    "/comments",
    {
      params: {
        ...rest,
        ...buildSpaceReputationParams({
          spaceReputation,
          spaceReputationId,
          spaceReputationDescendants,
        }),
      },
    }
  );
  return response.data;
}
