import { SublayHttpClient } from "../../core/client";
import { SpaceDetailed } from "../../interfaces/Space";

export interface FetchSpaceProps {
  spaceId: string;
}

export async function fetchSpace(
  client: SublayHttpClient,
  data: FetchSpaceProps
): Promise<SpaceDetailed> {
  const { spaceId } = data;
  const response = await client.projectInstance.get<SpaceDetailed>(
    `/spaces/${spaceId}`
  );
  return response.data;
}
