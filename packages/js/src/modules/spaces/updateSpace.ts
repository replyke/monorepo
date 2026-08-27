import { SublayHttpClient } from "../../core/client";
import { Space, ReadingPermission, PostingPermission, SpaceVisibility } from "../../interfaces/Space";
import { appendField, appendFields, appendFile } from "../../core/multipart";
import type { SpaceImageUpload } from "./createSpace";

export interface UpdateSpaceProps {
  spaceId: string;
  name?: string;
  slug?: string;
  description?: string;
  readingPermission?: ReadingPermission;
  postingPermission?: PostingPermission;
  visibility?: SpaceVisibility;
  metadata?: Record<string, any>;
  nsfw?: boolean;
  /**
   * New avatar image. When present the request is sent as `multipart/form-data`
   * and the server processes the image per `options`, replacing the old avatar.
   */
  avatarFile?: SpaceImageUpload;
  /** New banner image; same contract as {@link UpdateSpaceProps.avatarFile}. */
  bannerFile?: SpaceImageUpload;
}

export async function updateSpace(
  client: SublayHttpClient,
  data: UpdateSpaceProps
): Promise<Space> {
  const { spaceId, avatarFile, bannerFile, ...body } = data;
  const path = `/spaces/${spaceId}`;

  if (avatarFile || bannerFile) {
    const formData = new FormData();

    if (avatarFile) {
      appendFile(formData, "avatarFile", avatarFile.file, { fallback: "avatar" });
      appendField(formData, "avatarFile.options", avatarFile.options);
    }
    if (bannerFile) {
      appendFile(formData, "bannerFile", bannerFile.file, { fallback: "banner" });
      appendField(formData, "bannerFile.options", bannerFile.options);
    }

    appendFields(formData, body);

    const response = await client.projectInstance.patch<Space>(path, formData);
    return response.data;
  }

  const response = await client.projectInstance.patch<Space>(path, body);
  return response.data;
}
