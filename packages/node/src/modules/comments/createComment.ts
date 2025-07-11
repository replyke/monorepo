import { ReplykeHttpClient } from "../../core/client";

export interface CreateCommentProps {
  foreignId?: string;
  userId: string;
  entityId: string;
  content: string;
  parentId?: string;
  referencedCommentId?: string;
  attachments?: Record<string, any>[];
  metadata?: Record<string, any>;
}

export async function createComment(
  client: ReplykeHttpClient,
  data: CreateCommentProps
): Promise<Comment> {
  const path = `/comments`; // assuming client handles prefix like /{projectId}
  const response = await client.projectInstance.post<any>(path, data);
  return response.data;
}
