import { SublayHttpClient } from "../../core/client";

export interface UploadFileResponse {
  fileId: string;
  type: string;
  relativePath: string;
  publicPath: string;
  size: number;
  mimeType: string;
  /** ISO-8601 timestamp. */
  createdAt: string;
}

export interface UploadFileProps {
  /** The file to upload, as a browser `File` or `Blob`. */
  file: Blob | File;
  /** Optional filename for the multipart part (defaults to the `File.name` or `"upload"`). */
  filename?: string;
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
}

export async function uploadFile(
  client: SublayHttpClient,
  data: UploadFileProps
): Promise<UploadFileResponse> {
  const { file, filename, ...fields } = data;

  const formData = new FormData();
  // The server's multer config reads the file from the `file` field.
  const resolvedName =
    filename ?? (file instanceof File ? file.name : undefined) ?? "upload";
  formData.append("file", file, resolvedName);

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      formData.append(
        key,
        typeof value === "object" ? JSON.stringify(value) : String(value)
      );
    }
  }

  // Do not set Content-Type manually — the browser/axios derives the multipart
  // boundary from the FormData instance; a hand-set header would omit it and
  // break parsing.
  const response = await client.projectInstance.post<UploadFileResponse>(
    "/storage",
    formData
  );
  return response.data;
}
