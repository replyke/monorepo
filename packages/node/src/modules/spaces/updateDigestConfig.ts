import { ReplykeHttpClient } from "../../core/client";
import { DigestConfig } from "../../interfaces/Space";

export interface UpdateDigestConfigProps {
  spaceId: string;
  digestEnabled?: boolean;
  digestWebhookUrl?: string;
  digestWebhookSecret?: string;
  digestScheduleHour?: number;
  digestTimezone?: string;
}

export async function updateDigestConfig(
  client: ReplykeHttpClient,
  data: UpdateDigestConfigProps
): Promise<DigestConfig> {
  const { spaceId, ...body } = data;
  const response = await client.projectInstance.patch<DigestConfig>(
    `/spaces/${spaceId}/digest-config`,
    body
  );
  return response.data;
}
