import { SublayHttpClient } from "../../core/client";
import { Space } from "../../interfaces/Space";
import { PaginatedResponse } from "../../interfaces/IPaginatedResponse";

export interface FetchMutualSpacesProps {
  /** The OTHER user — spaces shared with this user are returned. */
  userId: string;
  page?: number;
  limit?: number;
  include?: string;
}

export async function fetchMutualSpaces(
  client: SublayHttpClient,
  { userId, ...params }: FetchMutualSpacesProps
): Promise<PaginatedResponse<Space>> {
  const response = await client.projectInstance.get<PaginatedResponse<Space>>(
    `/spaces/mutual/${userId}`,
    { params }
  );
  return response.data;
}
