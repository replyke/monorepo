import { SublayHttpClient } from "../../core/client";
import { ChatMessage } from "../../interfaces/ChatMessage";
import { GifData } from "../../interfaces/Comment";
import { Mention } from "../../interfaces/Mention";
import { appendFields, appendFile } from "../../core/multipart";

export interface SendMessageProps {
  conversationId: string;
  content?: string;
  gif?: GifData | null;
  mentions?: Mention[];
  parentMessageId?: string;
  quotedMessageId?: string;
  metadata?: Record<string, any>;
  /** Client-generated id echoed back on the created message (not stored). */
  localId?: string;
  /**
   * Optional file attachments (browser `File`/`Blob`), up to 10. When present
   * the request is sent as `multipart/form-data`; otherwise it's a JSON body.
   */
  files?: (Blob | File)[];
}

export async function sendMessage(
  client: SublayHttpClient,
  data: SendMessageProps
): Promise<ChatMessage> {
  const { conversationId, files, ...body } = data;
  const path = `/chat/conversations/${conversationId}/messages`;

  if (files && files.length > 0) {
    const formData = new FormData();
    // The server's multer config reads attachments from the `files` field.
    for (const file of files) {
      appendFile(formData, "files", file, { fallback: "attachment" });
    }
    // Multer delivers non-file fields as strings; the server's
    // parseChatMessageFields middleware JSON-parses gif/mentions/metadata back,
    // so object/array fields must be stringified here.
    appendFields(formData, body);
    const response = await client.projectInstance.post<ChatMessage>(
      path,
      formData
    );
    return response.data;
  }

  const response = await client.projectInstance.post<ChatMessage>(path, body);
  return response.data;
}
