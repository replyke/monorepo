import { ReplykeHttpClient } from "../../core/client";
import { File } from "../../interfaces/File";

export interface UploadFileProps {
  file: Uint8Array | Blob;
  filename?: string;
  mimeType?: string;
  entityId?: string;
  commentId?: string;
  spaceId?: string;
  metadata?: Record<string, any>;
}

export async function uploadFile(
  client: ReplykeHttpClient,
  data: UploadFileProps
): Promise<File> {
  const { file, filename, mimeType, ...fields } = data;

  const formData = new FormData();
  // Cast needed because TypeScript's Blob constructor types are stricter than Node.js runtime allows
  const blob =
    file instanceof Blob
      ? file
      : new Blob([file as unknown as BlobPart], { type: mimeType ?? "application/octet-stream" });

  formData.append("file", blob, filename ?? "upload");

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      formData.append(key, typeof value === "object" ? JSON.stringify(value) : String(value));
    }
  }

  const response = await client.projectInstance.post<File>(
    "/storage",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return response.data;
}
