import { SublayHttpClient } from "../../core/client";
import { EstablishedConnection } from "../../interfaces/Connection";
import { PaginatedResponse } from "../../interfaces/IPaginatedResponse";
import { UserSearchParams } from "../../interfaces/UserSearch";

export interface FetchConnectionsProps extends UserSearchParams {
  userId: string;
  page?: number;
  limit?: number;
}

export async function fetchConnections(
  client: SublayHttpClient,
  data: FetchConnectionsProps
): Promise<PaginatedResponse<EstablishedConnection>> {
  const response = await client.projectInstance.get<
    PaginatedResponse<EstablishedConnection>
  >("/connections", { params: data });
  return response.data;
}
