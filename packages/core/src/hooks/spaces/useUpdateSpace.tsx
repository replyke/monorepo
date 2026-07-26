import { useCallback } from "react";
import useProject from "../projects/useProject";
import {
  SpaceDetailed,
  ReadingPermission,
  PostingPermission,
  SpaceVisibility,
} from "../../interfaces/models/Space";
import { UploadImageOptions } from "../../interfaces/models/Image";
import useAxiosPrivate from "../../config/useAxiosPrivate";
import useSpace from "./useSpace";

// Image upload configuration (similar to useCreateEntity pattern)
interface ImageUploadConfig {
  file: File | Blob;
  options: UploadImageOptions;
}

export interface UpdateSpaceProps {
  spaceId: string;
  update: Partial<{
    name: string;
    slug: string | null;
    description: string | null;
    avatar: ImageUploadConfig;
    banner: ImageUploadConfig;
    readingPermission: ReadingPermission;
    postingPermission: PostingPermission;
    visibility: SpaceVisibility;
    requireJoinApproval: boolean;
    metadata: Record<string, any>;
    nsfw: boolean;
  }>;
}

function useUpdateSpace(): (props: UpdateSpaceProps) => Promise<SpaceDetailed> {
  const axios = useAxiosPrivate();
  const { projectId } = useProject();
  const { setSpace } = useSpace();

  const updateSpace = useCallback(
    async ({ spaceId, update }: UpdateSpaceProps) => {
      if (!projectId) {
        throw new Error("No projectId available.");
      }

      if (!spaceId) {
        throw new Error("Please pass a spaceId");
      }

      // Build FormData if files are present, otherwise use JSON
      const hasFiles = update.avatar || update.banner;

      if (hasFiles) {
        const formData = new FormData();

        // Append regular fields
        if (update.name !== undefined) {
          formData.append("name", update.name);
        }
        if (update.slug !== undefined) {
          formData.append("slug", update.slug || "");
        }
        if (update.description !== undefined) {
          formData.append("description", update.description || "");
        }
        if (update.readingPermission !== undefined) {
          formData.append("readingPermission", update.readingPermission);
        }
        if (update.postingPermission !== undefined) {
          formData.append("postingPermission", update.postingPermission);
        }
        if (update.visibility !== undefined) {
          formData.append("visibility", update.visibility);
        }
        if (update.requireJoinApproval !== undefined) {
          formData.append(
            "requireJoinApproval",
            String(update.requireJoinApproval),
          );
        }
        if (update.metadata !== undefined) {
          formData.append("metadata", JSON.stringify(update.metadata));
        }
        if (update.nsfw !== undefined) {
          formData.append("nsfw", String(update.nsfw));
        }

        // Append avatar file and options
        if (update.avatar) {
          formData.append("avatarFile", update.avatar.file);
          formData.append(
            "avatarFile.options",
            JSON.stringify(update.avatar.options),
          );
        }

        // Append banner file and options
        if (update.banner) {
          formData.append("bannerFile", update.banner.file);
          formData.append(
            "bannerFile.options",
            JSON.stringify(update.banner.options),
          );
        }

        const response = await axios.patch(
          `/${projectId}/spaces/${spaceId}`,
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
          },
        );

        return response.data as SpaceDetailed;
      } else {
        // No files - use JSON request (backward compatibility)
        const response = await axios.patch(
          `/${projectId}/spaces/${spaceId}`,
          update,
        );

        const updatedSpace = response.data as SpaceDetailed;
        setSpace?.(updatedSpace);
        return updatedSpace;
      }
    },
    [projectId, axios],
  );

  return updateSpace;
}

export default useUpdateSpace;
