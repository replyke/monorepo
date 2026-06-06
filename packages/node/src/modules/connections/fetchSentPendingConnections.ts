import { SublayHttpClient } from "../../core/client";
import { PendingConnectionListResponse } from "../../interfaces/Connection";

export interface FetchSentPendingConnectionsProps {
  userId: string;
  page?: number;
  limit?: number;
}

export async function fetchSentPendingConnections(
  client: SublayHttpClient,
  data: FetchSentPendingConnectionsProps
): Promise<PendingConnectionListResponse> {
  const response =
    await client.projectInstance.get<PendingConnectionListResponse>(
      "/connections/pending/sent",
      { params: data }
    );
  return response.data;
}
