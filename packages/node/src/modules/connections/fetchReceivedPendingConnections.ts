import { SublayHttpClient } from "../../core/client";
import { PendingConnection } from "../../interfaces/Connection";
import { PaginatedResponse } from "../../interfaces/IPaginatedResponse";

export interface FetchReceivedPendingConnectionsProps {
  userId: string;
  page?: number;
  limit?: number;
}

export async function fetchReceivedPendingConnections(
  client: SublayHttpClient,
  data: FetchReceivedPendingConnectionsProps
): Promise<PaginatedResponse<PendingConnection>> {
  const response =
    await client.projectInstance.get<PaginatedResponse<PendingConnection>>(
      "/connections/pending/received",
      { params: data }
    );
  return response.data;
}
