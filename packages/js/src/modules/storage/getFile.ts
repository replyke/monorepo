import { SublayHttpClient } from "../../core/client";
import { UploadedImageVariant } from "./uploadImage";

export interface GetFileImage {
  originalWidth: number;
  originalHeight: number;
  variants: Record<string, UploadedImageVariant>;
  processingStatus: "completed" | "failed";
  format: string;
  quality: number;
  exifStripped: boolean;
}

/** Shape returned by `GET /storage/:fileId` (a flat projection, not the populated `File` model). */
export interface GetFileResponse {
  fileId: string;
  type: string;
  originalPath: string;
  originalSize: number;
  originalMimeType: string;
  position: number | null;
  metadata: Record<string, any> | null;
  /** ISO-8601 timestamp. */
  createdAt: string;
  /** ISO-8601 timestamp. */
  updatedAt: string;
  // Present only when set on the file.
  userId?: string;
  entityId?: string;
  commentId?: string;
  spaceId?: string;
  // Present only for image files.
  image?: GetFileImage;
}

export interface GetFileProps {
  fileId: string;
}

export async function getFile(
  client: SublayHttpClient,
  data: GetFileProps
): Promise<GetFileResponse> {
  const { fileId } = data;
  const response = await client.projectInstance.get<GetFileResponse>(
    `/storage/${fileId}`
  );
  return response.data;
}
