import { ReplykeHttpClient } from "../../core/client";
import { ConnectionCountResponse } from "../../interfaces/Connection";

export async function fetchConnectionsCount(
  client: ReplykeHttpClient
): Promise<ConnectionCountResponse> {
  const response = await client.projectInstance.get<ConnectionCountResponse>(
    "/connections/count"
  );
  return response.data;
}
