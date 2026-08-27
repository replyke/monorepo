import { SublayHttpClient } from "../../core/client";
import { Space } from "../../interfaces/Space";
import { PaginatedResponse } from "../../interfaces/IPaginatedResponse";

export interface FetchMutualSpacesProps {
  /** The OTHER user — spaces shared with this user are returned. */
  userId: string;
  /** The acting (authenticated) user. A service/master key is required to name a user. */
  actingUserId: string;
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
