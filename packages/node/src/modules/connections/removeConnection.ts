import { ReplykeHttpClient } from "../../core/client";

export interface RemoveConnectionProps {
  connectionId: string;
}

export async function removeConnection(
  client: ReplykeHttpClient,
  data: RemoveConnectionProps
): Promise<void> {
  const { connectionId } = data;
  await client.projectInstance.delete(`/connections/${connectionId}`);
}
