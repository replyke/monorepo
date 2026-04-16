import { ReplykeHttpClient } from "../../core/client";
import { ConnectionActionResponse } from "../../interfaces/Connection";

export interface AcceptConnectionProps {
  connectionId: string;
}

export async function acceptConnection(
  client: ReplykeHttpClient,
  data: AcceptConnectionProps
): Promise<ConnectionActionResponse> {
  const { connectionId } = data;
  const response = await client.projectInstance.patch<ConnectionActionResponse>(
    `/connections/${connectionId}/accept`
  );
  return response.data;
}
