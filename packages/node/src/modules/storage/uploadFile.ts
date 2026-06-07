import { SublayHttpClient } from "../../core/client";
import { appendFile, appendFields } from "../../core/formData";
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
  appendFile(formData, "file", file, filename, mimeType);
  appendFields(formData, fields);

  const response = await client.projectInstance.post<File>("/storage", formData);
  return response.data;
}
