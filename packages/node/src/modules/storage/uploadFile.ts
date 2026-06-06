import { SublayHttpClient } from "../../core/client";
import { File } from "../../interfaces/File";

export interface UploadFileProps {
  file: Uint8Array | Blob;
  filename?: string;
  mimeType?: string;
  /**
   * Storage path segments for the file, e.g. ["avatars", userId]. Required by
   * the server (`uploadFileBodySchema.pathParts`).
   */
  pathParts: string[];
  /** Ordering within the associated entity/comment/space. */
  position?: number;
  metadata?: Record<string, any>;
  /** Only one of entityId/commentId/spaceId may be set. */
  entityId?: string;
  commentId?: string;
  spaceId?: string;
  /**
   * Attribute the upload to a user. With a service key this may be any user;
   * omit for a backend/project-owned file.
   */
  userId?: string;
}

export async function uploadFile(
  client: SublayHttpClient,
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

  // Do not set Content-Type manually — axios derives the multipart boundary from
  // the FormData instance; a hand-set header would omit it and break parsing.
  const response = await client.projectInstance.post<File>("/storage", formData);
  return response.data;
}
