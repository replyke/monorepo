import { SublayHttpClient } from "../../core/client";
import { ConnectionCountResponse } from "../../interfaces/Connection";

export interface FetchConnectionsCountProps {
  userId: string;
}

export async function fetchConnectionsCount(
  client: SublayHttpClient,
  data: FetchConnectionsCountProps
): Promise<ConnectionCountResponse> {
  const response = await client.projectInstance.get<ConnectionCountResponse>(
    "/connections/count",
    { params: data }
  );
  return response.data;
}
