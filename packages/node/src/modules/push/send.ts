import { SublayHttpClient } from "../../core/client";
import { SendPushResult } from "../../interfaces/Push";

export interface SendPushProps {
  userIds: string[];
  title: string;
  body: string;
  data?: Record<string, any>;
}

export async function send(
  client: SublayHttpClient,
  data: SendPushProps
): Promise<SendPushResult> {
  const path = `/push-notifications/send`;
  const response = await client.projectInstance.post<SendPushResult>(path, data);
  return response.data;
}
