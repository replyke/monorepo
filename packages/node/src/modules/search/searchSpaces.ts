import { SublayHttpClient } from "../../core/client";
import { Space } from "../../interfaces/Space";
import { PaginatedResponse } from "../../interfaces/IPaginatedResponse";

export interface SearchSpacesProps {
  query: string;
  limit?: number;
}

export async function searchSpaces(
  client: SublayHttpClient,
  data: SearchSpacesProps
): Promise<PaginatedResponse<Space>> {
  const response = await client.projectInstance.post<PaginatedResponse<Space>>(
    "/search/spaces",
    data
  );
  return response.data;
}
