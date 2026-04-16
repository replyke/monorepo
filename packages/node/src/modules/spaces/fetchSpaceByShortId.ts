import { ReplykeHttpClient } from "../../core/client";
import { SpaceDetailed } from "../../interfaces/Space";

export interface FetchSpaceByShortIdProps {
  shortId: string;
}

export async function fetchSpaceByShortId(
  client: ReplykeHttpClient,
  data: FetchSpaceByShortIdProps
): Promise<SpaceDetailed> {
  const response = await client.projectInstance.get<SpaceDetailed>(
    "/spaces/by-short-id",
    { params: data }
  );
  return response.data;
}
