import { SublayHttpClient } from "../../core/client";
import { ConnectionActionResponse } from "../../interfaces/Connection";

export interface AcceptConnectionProps {
  connectionId: string;
  userId: string;
}

export async function acceptConnection(
  client: SublayHttpClient,
  data: AcceptConnectionProps
): Promise<ConnectionActionResponse> {
  const { connectionId, userId } = data;
  const response = await client.projectInstance.patch<ConnectionActionResponse>(
    `/connections/${connectionId}/accept`,
    { userId }
  );
  return response.data;
}
