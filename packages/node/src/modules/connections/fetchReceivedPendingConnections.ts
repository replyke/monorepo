import { SublayHttpClient } from "../../core/client";
import { PendingConnectionListResponse } from "../../interfaces/Connection";

export interface FetchReceivedPendingConnectionsProps {
  userId: string;
  page?: number;
  limit?: number;
}

export async function fetchReceivedPendingConnections(
  client: SublayHttpClient,
  data: FetchReceivedPendingConnectionsProps
): Promise<PendingConnectionListResponse> {
  const response =
    await client.projectInstance.get<PendingConnectionListResponse>(
      "/connections/pending/received",
      { params: data }
    );
  return response.data;
}
