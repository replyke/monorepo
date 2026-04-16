import { ReplykeHttpClient } from "../../core/client";
import { SpaceDetailed } from "../../interfaces/Space";

export interface FetchSpaceProps {
  spaceId: string;
}

export async function fetchSpace(
  client: ReplykeHttpClient,
  data: FetchSpaceProps
): Promise<SpaceDetailed> {
  const { spaceId } = data;
  const response = await client.projectInstance.get<SpaceDetailed>(
    `/spaces/${spaceId}`
  );
  return response.data;
}
