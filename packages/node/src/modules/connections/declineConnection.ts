import { SublayHttpClient } from "../../core/client";
import { ConnectionActionResponse } from "../../interfaces/Connection";

export interface DeclineConnectionProps {
  connectionId: string;
}

export async function declineConnection(
  client: SublayHttpClient,
  data: DeclineConnectionProps
): Promise<ConnectionActionResponse> {
  const { connectionId } = data;
  const response = await client.projectInstance.patch<ConnectionActionResponse>(
    `/connections/${connectionId}/decline`
  );
  return response.data;
}
