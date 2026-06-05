import { SublayHttpClient } from "../../core/client";
import { Space } from "../../interfaces/Space";
import { PaginatedResponse } from "../../interfaces/IPaginatedResponse";

export interface FetchChildSpacesProps {
  spaceId: string;
  page?: number;
  limit?: number;
  sortBy?: "alphabetical" | "newest" | "members";
  include?: string;
}

export async function fetchChildSpaces(
  client: SublayHttpClient,
  data: FetchChildSpacesProps
): Promise<PaginatedResponse<Space>> {
  const { spaceId, ...params } = data;
  const response = await client.projectInstance.get<PaginatedResponse<Space>>(
    `/spaces/${spaceId}/children`,
    { params }
  );
  return response.data;
}
