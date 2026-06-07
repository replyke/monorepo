import { SublayHttpClient } from "../../core/client";
import { TopComment } from "../../interfaces/Entity";

export interface FetchTopCommentProps {
  entityId: string;
}

export async function fetchTopComment(
  client: SublayHttpClient,
  data: FetchTopCommentProps
): Promise<TopComment | null> {
  const { entityId } = data;
  const response = await client.projectInstance.get<TopComment | null>(
    `/entities/${entityId}/top-comment`
  );
  return response.data;
}
