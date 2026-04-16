import { ReplykeHttpClient } from "../../core/client";
import { Comment } from "../../interfaces/Comment";
import { PaginatedResponse } from "../../interfaces/IPaginatedResponse";

export interface FetchManyCommentsProps {
  entityId: string;
  parentId?: string | null;
  page?: number;
  limit?: number;
  sort?: "top" | "new" | "old";
}

export async function fetchManyComments(
  client: ReplykeHttpClient,
  data: FetchManyCommentsProps
): Promise<PaginatedResponse<Comment>> {
  const response = await client.projectInstance.get<PaginatedResponse<Comment>>(
    "/comments",
    { params: data }
  );
  return response.data;
}
