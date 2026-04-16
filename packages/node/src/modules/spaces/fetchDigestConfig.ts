import { ReplykeHttpClient } from "../../core/client";
import { DigestConfig } from "../../interfaces/Space";

export interface FetchDigestConfigProps {
  spaceId: string;
}

export async function fetchDigestConfig(
  client: ReplykeHttpClient,
  data: FetchDigestConfigProps
): Promise<DigestConfig> {
  const { spaceId } = data;
  const response = await client.projectInstance.get<DigestConfig>(
    `/spaces/${spaceId}/digest-config`
  );
  return response.data;
}
