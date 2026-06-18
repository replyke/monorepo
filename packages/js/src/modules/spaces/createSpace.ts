import { SublayHttpClient } from "../../core/client";
import { Space, ReadingPermission, PostingPermission } from "../../interfaces/Space";
import { ImageOptions } from "../../interfaces/ImageProcessing";
import { appendField, appendFields, appendFile } from "../../core/multipart";

/** A file plus the image-processing options the server requires alongside it. */
export interface SpaceImageUpload {
  file: Blob | File;
  /** Image-processing config (must include `mode`) — see {@link ImageOptions}. */
  options: ImageOptions;
}

export interface CreateSpaceProps {
  name: string;
  slug?: string;
  description?: string;
  readingPermission?: ReadingPermission;
  postingPermission?: PostingPermission;
  requireJoinApproval?: boolean;
  parentSpaceId?: string;
  metadata?: Record<string, any>;
  /**
   * Avatar image. When present the request is sent as `multipart/form-data` and
   * the server processes the image per `options`.
   */
  avatarFile?: SpaceImageUpload;
  /** Banner image; same contract as {@link CreateSpaceProps.avatarFile}. */
  bannerFile?: SpaceImageUpload;
}

export async function createSpace(
  client: SublayHttpClient,
  data: CreateSpaceProps
): Promise<Space> {
  const { avatarFile, bannerFile, ...body } = data;

  if (avatarFile || bannerFile) {
    const formData = new FormData();

    // Files go under `avatarFile`/`bannerFile`; their options ride alongside as
    // `<field>.options` JSON strings (the server's parseImageOptions middleware
    // parses them). Object fields (metadata) and booleans are stringified by
    // appendFields; the server coerces them back.
    if (avatarFile) {
      appendFile(formData, "avatarFile", avatarFile.file, { fallback: "avatar" });
      appendField(formData, "avatarFile.options", avatarFile.options);
    }
    if (bannerFile) {
      appendFile(formData, "bannerFile", bannerFile.file, { fallback: "banner" });
      appendField(formData, "bannerFile.options", bannerFile.options);
    }

    appendFields(formData, body);

    const response = await client.projectInstance.post<Space>(
      "/spaces",
      formData
    );
    return response.data;
  }

  const response = await client.projectInstance.post<Space>("/spaces", body);
  return response.data;
}
