import { SublayHttpClient } from "../../core/client";
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
  // Cast needed because TypeScript's Blob constructor types are stricter than Node.js runtime allows
  const blob =
    file instanceof Blob
      ? file
      : new Blob([file as unknown as BlobPart], { type: mimeType ?? "application/octet-stream" });

  formData.append("file", blob, filename ?? "upload");

  // The server reads the image-processing options as individual top-level
  // multipart fields (mode + mode-specific keys + quality/format/stripExif/fit),
  // not as a nested object — so flatten imageOptions alongside the other fields.
  const fields: Record<string, unknown> = { ...imageOptions, ...rest };

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      formData.append(key, typeof value === "object" ? JSON.stringify(value) : String(value));
    }
  }

  // Do not set Content-Type manually — axios derives the multipart boundary from
  // the FormData instance; a hand-set header would omit it and break parsing.
  const response = await client.projectInstance.post<File>(
    "/storage/images",
    formData
  );
  return response.data;
}
