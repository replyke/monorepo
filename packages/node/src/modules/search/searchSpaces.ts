import { ReplykeHttpClient } from "../../core/client";
import { Space } from "../../interfaces/Space";
import { PaginatedResponse } from "../../interfaces/IPaginatedResponse";

export interface SearchSpacesProps {
  query: string;
  page?: number;
  limit?: number;
}

export async function searchSpaces(
  client: ReplykeHttpClient,
  data: SearchSpacesProps
): Promise<PaginatedResponse<Space>> {
  const response = await client.projectInstance.post<PaginatedResponse<Space>>(
    "/search/spaces",
    data
  );
  return response.data;
}
