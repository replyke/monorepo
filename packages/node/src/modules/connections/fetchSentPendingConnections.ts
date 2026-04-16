import { ReplykeHttpClient } from "../../core/client";
import { PendingConnection, PendingConnectionListResponse } from "../../interfaces/Connection";

export interface FetchSentPendingConnectionsProps {
  page?: number;
  limit?: number;
}

export async function fetchSentPendingConnections(
  client: ReplykeHttpClient,
  data: FetchSentPendingConnectionsProps
): Promise<PendingConnectionListResponse> {
  const response =
    await client.projectInstance.get<PendingConnectionListResponse>(
      "/connections/pending/sent",
      { params: data }
    );
  return response.data;
}
