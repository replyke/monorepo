import { SublayHttpClient } from "../../core/client";
import { Space } from "../../interfaces/Space";
import { PaginatedResponse } from "../../interfaces/IPaginatedResponse";

export interface FetchManySpacesProps {
  page?: number;
  limit?: number;
  parentSpaceId?: string;
  query?: string;
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
