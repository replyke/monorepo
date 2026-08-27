import { SublayHttpClient } from "../../core/client";
import { Comment, GifData } from "../../interfaces/Comment";
import { Mention } from "../../interfaces/Mention";

export interface CreateCommentProps {
  entityId: string;
  foreignId?: string;
  content?: string;
  gif?: GifData | null;
  mentions?: Mention[];
  parentId?: string | null;
  referencedCommentId?: string;
  attachments?: Record<string, any>[];
  metadata?: Record<string, any>;
}

export async function createComment(
  client: SublayHttpClient,
  data: CreateCommentProps
): Promise<Comment> {
  const response = await client.projectInstance.post<Comment>(
    "/comments",
    data
  );
  return response.data;
}
