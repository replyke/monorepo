import { SublayHttpClient } from "../../core/client";
import { ImageOptions } from "../../interfaces/ImageProcessing";

export interface UploadedImageVariant {
  path: string;
  width: number;
  height: number;
  size: number;
  format: string;
  publicPath: string;
}

export interface UploadImageResponse {
  fileId: string;
  type: "image";
  originalPath: string;
  originalSize: number;
  originalWidth: number;
  originalHeight: number;
  variants: Record<string, UploadedImageVariant>;
  format: string;
  quality: number;
  /** ISO-8601 timestamp. */
  createdAt: string;
}

export interface UploadImageProps {
  /** The image to upload, as a browser `File` or `Blob`. */
  file: Blob | File;
  /** Optional filename for the multipart part (defaults to the `File.name` or `"upload"`). */
  filename?: string;
  /**
   * Image-processing configuration. A discriminated union on `mode` mirroring
   * the server's `uploadImageBodySchema` — see {@link ImageOptions}.
   */
  imageOptions: ImageOptions;
  /** Storage path segments, e.g. ["spaces", spaceId, "banner"]. */
  pathParts?: string[];
  /** Only one of entityId/commentId/spaceId may be set. */
  entityId?: string;
  commentId?: string;
  spaceId?: string;
}

export async function uploadImage(
  client: SublayHttpClient,
  data: UploadImageProps
): Promise<UploadImageResponse> {
  const { file, filename, imageOptions, ...rest } = data;

  const formData = new FormData();
  // The server's multer config reads the file from the `file` field.
  const resolvedName =
    filename ?? (file instanceof File ? file.name : undefined) ?? "upload";
  formData.append("file", file, resolvedName);

  // The server reads the image-processing options as individual top-level
  // multipart fields (mode + mode-specific keys + quality/format/stripExif/fit),
  // not as a nested object — so flatten imageOptions alongside the other fields.
  const fields: Record<string, unknown> = { ...imageOptions, ...rest };

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
  const response = await client.projectInstance.post<UploadImageResponse>(
    "/storage/images",
    formData
  );
  return response.data;
}
