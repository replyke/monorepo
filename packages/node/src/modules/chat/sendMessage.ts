import { SublayHttpClient } from "../../core/client";
import { appendFile, appendFields } from "../../core/formData";
import { ChatMessage } from "../../interfaces/ChatMessage";
import { GifData } from "../../interfaces/Comment";
import { Mention } from "../../interfaces/Mention";
import { SpaceReputationContextParams } from "../../interfaces/SpaceReputation";

export interface ChatMessageFile {
  file: Uint8Array | Blob;
  filename?: string;
  mimeType?: string;
}

export interface SendMessageProps extends SpaceReputationContextParams {
  conversationId: string;
  /** The message author (must be a member). Service key required to name a user. */
  userId: string;
  content?: string;
  gif?: GifData | null;
  mentions?: Mention[];
  parentMessageId?: string;
  quotedMessageId?: string;
  metadata?: Record<string, any>;
  /** Client-generated id echoed back on the created message (not stored). */
  localId?: string;
  /** Attachments. When present, the request is sent as multipart/form-data. */
  files?: ChatMessageFile[];
}

export async function sendMessage(
  client: SublayHttpClient,
  data: SendMessageProps
): Promise<ChatMessage> {
  const {
    conversationId,
    files,
    spaceReputationId,
    spaceReputationDescendants,
    ...body
  } = data;
  const url = `/chat/conversations/${conversationId}/messages`;

  // Space-reputation opts go as query params (never body fields), so they
  // travel the same way for both the JSON and multipart variants.
  const params = { spaceReputationId, spaceReputationDescendants };

  // With attachments, send multipart: object fields are JSON-stringified (the
  // server parses them back) and the files are appended. Otherwise send JSON.
  if (files && files.length > 0) {
    const formData = new FormData();
    appendFields(formData, body);
    for (const f of files) {
      appendFile(formData, "files", f.file, f.filename, f.mimeType);
    }
    const response = await client.projectInstance.post<ChatMessage>(
      url,
      formData,
      { params }
    );
    return response.data;
  }

  const response = await client.projectInstance.post<ChatMessage>(url, body, {
    params,
  });
  return response.data;
}
