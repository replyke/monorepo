import { SublayHttpClient } from "../../core/client";
import { ConnectionActionResponse } from "../../interfaces/Connection";

export interface DeclineConnectionProps {
  connectionId: string;
  userId: string;
}

export async function declineConnection(
  client: SublayHttpClient,
  data: DeclineConnectionProps
): Promise<ConnectionActionResponse> {
  const { connectionId, userId } = data;
  const response = await client.projectInstance.patch<ConnectionActionResponse>(
    `/connections/${connectionId}/decline`,
    { userId }
  );
  return response.data;
}
