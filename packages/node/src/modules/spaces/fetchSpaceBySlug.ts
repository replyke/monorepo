import { ReplykeHttpClient } from "../../core/client";
import { SpaceDetailed } from "../../interfaces/Space";

export interface FetchSpaceBySlugProps {
  slug: string;
}

export async function fetchSpaceBySlug(
  client: ReplykeHttpClient,
  data: FetchSpaceBySlugProps
): Promise<SpaceDetailed> {
  const response = await client.projectInstance.get<SpaceDetailed>(
    "/spaces/by-slug",
    { params: data }
  );
  return response.data;
}
