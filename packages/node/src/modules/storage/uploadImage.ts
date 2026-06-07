import { SublayHttpClient } from "../../core/client";
import { appendFile, appendFields } from "../../core/formData";
import { File } from "../../interfaces/File";
import { ImageOptions } from "../../interfaces/ImageProcessing";

export interface UploadImageProps {
  file: Uint8Array | Blob;
  filename?: string;
  mimeType?: string;
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
  /**
   * Attribute the upload to a user. With a service key this may be any user;
   * omit for a backend/project-owned file.
   */
  userId?: string;
}

export async function uploadImage(
  client: SublayHttpClient,
  data: UploadImageProps
): Promise<File> {
  const { file, filename, mimeType, imageOptions, ...rest } = data;

  const formData = new FormData();
  appendFile(formData, "file", file, filename, mimeType);
  // The server reads the image-processing options as individual top-level
  // multipart fields (mode + mode-specific keys + quality/format/stripExif/fit),
  // not as a nested object — so flatten imageOptions alongside the other fields.
  appendFields(formData, { ...imageOptions, ...rest });

  const response = await client.projectInstance.post<File>(
    "/storage/images",
    formData
  );
  return response.data;
}
