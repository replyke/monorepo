import { SublayHttpClient } from "../../core/client";
import { AuthUser } from "../../interfaces/User";
import { ImageOptions } from "../../interfaces/ImageProcessing";

/** A file plus the image-processing options the server requires alongside it. */
export interface UserImageUpload {
  file: Blob | File;
  /** Image-processing config (must include `mode`) — see {@link ImageOptions}. */
  options: ImageOptions;
}

export interface UpdateUserProps {
  /** The user to update (the target). A user token may only update itself. */
  userId: string;
  name?: string;
  username?: string;
  avatar?: string;
  bio?: string;
  birthdate?: string;
  location?: {
    latitude: number;
    longitude: number;
  } | null;
  metadata?: Record<string, any>;
  secureMetadata?: Record<string, any>;
  /**
   * New avatar image. When present the request is sent as `multipart/form-data`.
   * The server processes the image per `options` and replaces the old avatar.
   */
  avatarFile?: UserImageUpload;
  /** New banner image; same contract as {@link UpdateUserProps.avatarFile}. */
  bannerFile?: UserImageUpload;
}

export async function updateUser(
  client: SublayHttpClient,
  data: UpdateUserProps
): Promise<AuthUser> {
  const { userId, avatarFile, bannerFile, ...body } = data;
  const path = `/users/${userId}`;

  if (avatarFile || bannerFile) {
    const formData = new FormData();

    // Files go under `avatarFile`/`bannerFile`; their options ride alongside as
    // `<field>.options` JSON strings (the server's parseImageOptions middleware
    // parses them back).
    if (avatarFile) {
      formData.append(
        "avatarFile",
        avatarFile.file,
        avatarFile.file instanceof File ? avatarFile.file.name : "avatar"
      );
      formData.append("avatarFile.options", JSON.stringify(avatarFile.options));
    }
    if (bannerFile) {
      formData.append(
        "bannerFile",
        bannerFile.file,
        bannerFile.file instanceof File ? bannerFile.file.name : "banner"
      );
      formData.append("bannerFile.options", JSON.stringify(bannerFile.options));
    }

    // Object fields (location/metadata/secureMetadata) must be stringified; the
    // server reads them via jsonOrObject. Scalars go as plain strings.
    for (const [key, value] of Object.entries(body)) {
      if (value === undefined) continue;
      formData.append(
        key,
        typeof value === "object" ? JSON.stringify(value) : String(value)
      );
    }

    const response = await client.projectInstance.patch<AuthUser>(
      path,
      formData
    );
    return response.data;
  }

  const response = await client.projectInstance.patch<AuthUser>(path, body);
  return response.data;
}
