import { SublayHttpClient } from "../../core/client";
import { ImageOptions } from "../../interfaces/ImageProcessing";
import { appendFields, appendFile } from "../../core/multipart";

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
  appendFile(formData, "file", file, { filename });

  // The server reads the image-processing options as individual top-level
  // multipart fields (mode + mode-specific keys + quality/format/stripExif/fit),
  // not as a nested object — so flatten imageOptions alongside the other fields.
  appendFields(formData, { ...imageOptions, ...rest });

  const response = await client.projectInstance.post<UploadImageResponse>(
    "/storage/images",
    formData
  );
  return response.data;
}
