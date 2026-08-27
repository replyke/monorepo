import { SublayHttpClient } from "../../core/client";
import { Comment, GifData } from "../../interfaces/Comment";
import { Mention } from "../../interfaces/Mention";

export interface CreateCommentProps {
  foreignId?: string;
  userId: string;
  entityId: string;
  content?: string;
  gif?: GifData | null;
  mentions?: Mention[];
  parentId?: string;
  referencedCommentId?: string;
  attachments?: Record<string, any>[];
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export async function createComment(
  client: SublayHttpClient,
  data: CreateCommentProps
): Promise<Comment> {
  const path = `/comments`; // assuming client handles prefix like /{projectId}
  const response = await client.projectInstance.post<Comment>(path, data);
  return response.data;
}
