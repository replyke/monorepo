import { SublayHttpClient } from "../../core/client";
import { EstablishedConnection } from "../../interfaces/Connection";
import { PaginatedResponse } from "../../interfaces/IPaginatedResponse";
import { SpaceReputationUserParams } from "../../interfaces/SpaceReputation";

export interface FetchConnectionsByUserIdProps
  extends SpaceReputationUserParams {
  userId: string;
  page?: number;
  limit?: number;
}

export async function fetchConnectionsByUserId(
  client: SublayHttpClient,
  data: FetchConnectionsByUserIdProps
): Promise<PaginatedResponse<EstablishedConnection>> {
  const { userId, ...params } = data;
  const response = await client.projectInstance.get<
    PaginatedResponse<EstablishedConnection>
  >(`/users/${userId}/connections`, { params });
  return response.data;
}
