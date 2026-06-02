import { SublayHttpClient } from "../../core/client";
import { ModerationResponse } from "./moderateSpaceEntity";

export interface ModerateSpaceCommentProps {
  spaceId: string;
  commentId: string;
  action: "approve" | "remove";
  reason?: string;
}

export async function moderateSpaceComment(
  client: SublayHttpClient,
  data: ModerateSpaceCommentProps
): Promise<ModerationResponse> {
  const { spaceId, commentId, ...body } = data;
  const response = await client.projectInstance.patch<ModerationResponse>(
    `/spaces/${spaceId}/comments/${commentId}/moderation`,
    body
  );
  return response.data;
}
