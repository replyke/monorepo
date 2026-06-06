import { SublayHttpClient } from "../../core/client";
import { PendingConnection } from "../../interfaces/Connection";
import { PaginatedResponse } from "../../interfaces/IPaginatedResponse";

export interface FetchSentPendingConnectionsProps {
  userId: string;
  page?: number;
  limit?: number;
}

export async function fetchSentPendingConnections(
  client: SublayHttpClient,
  data: FetchSentPendingConnectionsProps
): Promise<PaginatedResponse<PendingConnection>> {
  const response =
    await client.projectInstance.get<PaginatedResponse<PendingConnection>>(
      "/connections/pending/sent",
      { params: data }
    );
  return response.data;
}
