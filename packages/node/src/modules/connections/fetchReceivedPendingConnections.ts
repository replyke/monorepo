import { ReplykeHttpClient } from "../../core/client";
import { PendingConnectionListResponse } from "../../interfaces/Connection";

export interface FetchReceivedPendingConnectionsProps {
  page?: number;
  limit?: number;
}

export async function fetchReceivedPendingConnections(
  client: ReplykeHttpClient,
  data: FetchReceivedPendingConnectionsProps
): Promise<PendingConnectionListResponse> {
  const response =
    await client.projectInstance.get<PendingConnectionListResponse>(
      "/connections/pending/received",
      { params: data }
    );
  return response.data;
}
