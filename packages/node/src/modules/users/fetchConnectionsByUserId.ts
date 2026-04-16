import { ReplykeHttpClient } from "../../core/client";
import { EstablishedConnection } from "../../interfaces/Connection";
import { PaginatedResponse } from "../../interfaces/IPaginatedResponse";

export interface FetchConnectionsByUserIdProps {
  userId: string;
  page?: number;
  limit?: number;
}

export async function fetchConnectionsByUserId(
  client: ReplykeHttpClient,
  data: FetchConnectionsByUserIdProps
): Promise<PaginatedResponse<EstablishedConnection>> {
  const { userId, ...params } = data;
  const response = await client.projectInstance.get<
    PaginatedResponse<EstablishedConnection>
  >(`/users/${userId}/connections`, { params });
  return response.data;
}
