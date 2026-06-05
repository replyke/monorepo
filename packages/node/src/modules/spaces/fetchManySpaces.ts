import { SublayHttpClient } from "../../core/client";
import { Space } from "../../interfaces/Space";
import { PaginatedResponse } from "../../interfaces/IPaginatedResponse";

export interface FetchManySpacesProps {
  page?: number;
  limit?: number;
  sortBy?: "alphabetical" | "newest" | "members";
  searchSlug?: string;
  searchName?: string;
  searchDescription?: string;
  searchAny?: string;
  memberOf?: "true";
  parentSpaceId?: string | "null";
  include?: string;
}

export async function fetchManySpaces(
  client: SublayHttpClient,
  data: FetchManySpacesProps
): Promise<PaginatedResponse<Space>> {
  const response = await client.projectInstance.get<PaginatedResponse<Space>>(
    "/spaces",
    { params: data }
  );
  return response.data;
}
