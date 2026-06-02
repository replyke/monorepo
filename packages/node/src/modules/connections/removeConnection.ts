import { SublayHttpClient } from "../../core/client";

export interface RemoveConnectionProps {
  connectionId: string;
}

export async function removeConnection(
  client: SublayHttpClient,
  data: RemoveConnectionProps
): Promise<void> {
  const { connectionId } = data;
  await client.projectInstance.delete(`/connections/${connectionId}`);
}
