import { SublayHttpClient } from "../../core/client";

export interface RemoveConnectionProps {
  connectionId: string;
  userId: string;
}

export async function removeConnection(
  client: SublayHttpClient,
  data: RemoveConnectionProps
): Promise<void> {
  const { connectionId, userId } = data;
  await client.projectInstance.delete(`/connections/${connectionId}`, {
    params: { userId },
  });
}
