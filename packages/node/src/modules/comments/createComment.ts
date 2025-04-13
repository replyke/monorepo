import { ReplykeHttpClient } from "../../core/client";

export interface CreateCommentProps {
  userId: string;
  entityId: string;
  content: string;
  referenceId?: string;
  parentId?: string;
  referencedCommentId?: string;
  attachments?: Record<string, any>[];
  metadata?: Record<string, any>;
}

export async function createComment(
  client: ReplykeHttpClient,
  data: CreateCommentProps
): Promise<any> {
  const path = `/comments`; // assuming client handles prefix like /{projectId}
  const response = await client.instance.post<any>(path, data);
  return response.data;
}
