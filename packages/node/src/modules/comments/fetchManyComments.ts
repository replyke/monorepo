import { SublayHttpClient } from "../../core/client";
import { Comment } from "../../interfaces/Comment";
import { PaginatedResponse } from "../../interfaces/IPaginatedResponse";
import { SpaceReputationContextParams } from "../../interfaces/SpaceReputation";

export interface FetchManyCommentsProps extends SpaceReputationContextParams {
  entityId?: string;
  userId?: string;
  parentId?: string;
  page?: number;
  limit?: number;
  sortBy?: "new" | "old" | "top" | "controversial";
  include?: string;
  sourceId?: string;
}

export async function fetchManyComments(
  client: SublayHttpClient,
  data: FetchManyCommentsProps
): Promise<PaginatedResponse<Comment>> {
  const response = await client.projectInstance.get<PaginatedResponse<Comment>>(
    "/comments",
    { params: data }
  );
  return response.data;
}
