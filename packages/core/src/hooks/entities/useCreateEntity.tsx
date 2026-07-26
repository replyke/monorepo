import { useCallback } from "react";
import useAxiosPrivate from "../../config/useAxiosPrivate";
import { Entity } from "../../interfaces/models/Entity";
import useProject from "../projects/useProject";
import { Mention } from "../../interfaces/models/Mention";
import { UploadImageOptions } from "../../interfaces/models/Image";

// Type guards (reused from useUploadImage pattern)
type BrowserFile = File;

interface RNFile {
  uri: string;
  name: string;
  type?: string;
}

type UniversalFile = BrowserFile | RNFile;

function isBrowserFile(file: UniversalFile): file is BrowserFile {
  return typeof File !== "undefined" && file instanceof File;
}

// Image upload configuration
interface ImageUploadConfig {
  files: UniversalFile[];
  options?: UploadImageOptions;
}

// File upload configuration
interface FileUploadConfig {
  files: UniversalFile[];
  options?: {
    pathParts?: string[];
  };
}

export interface CreateEntityProps {
  foreignId?: string;
  sourceId?: string;
  spaceId?: string;
  title?: string;
  content?: string;
  attachments?: Record<string, any>[];
  keywords?: string[];
  mentions?: Mention[];
  location?: {
    latitude: number;
    longitude: number;
  };
  metadata?: Record<string, any>;
  nsfw?: boolean;
  excludeUserId?: boolean;
  requireUser?: boolean;
  isDraft?: boolean;
  images?: ImageUploadConfig;
  files?: FileUploadConfig;
}

function useCreateEntity(): (props: CreateEntityProps) => Promise<Entity> {
  const axios = useAxiosPrivate();
  const { projectId } = useProject();

  const createEntity = useCallback(
    async (props: CreateEntityProps) => {
      const {
        foreignId,
        sourceId,
        spaceId,
        title,
        content,
        attachments,
        keywords,
        mentions,
        location,
        metadata,
        nsfw,
        excludeUserId,
        requireUser,
        isDraft,
        images,
        files,
      } = props;

      if (!projectId) {
        throw new Error("No projectId available.");
      }

      // DECISION POINT: JSON vs FormData
      const hasImages = images && images.files.length > 0;
      const hasFiles = files && files.files.length > 0;

      if (hasImages || hasFiles) {
        // NEW PATH: Multipart FormData request
        const formData = new FormData();

        // Append standard entity fields
        if (foreignId !== undefined) formData.append("foreignId", foreignId);
        if (sourceId !== undefined) formData.append("sourceId", sourceId);
        if (spaceId !== undefined) formData.append("spaceId", spaceId);
        if (title !== undefined) formData.append("title", title);
        if (content !== undefined) formData.append("content", content);
        if (attachments !== undefined) formData.append("attachments", JSON.stringify(attachments));
        if (keywords !== undefined) formData.append("keywords", JSON.stringify(keywords));
        if (mentions !== undefined) formData.append("mentions", JSON.stringify(mentions));
        if (location !== undefined) formData.append("location", JSON.stringify(location));
        if (metadata !== undefined) formData.append("metadata", JSON.stringify(metadata));
        if (nsfw !== undefined) formData.append("nsfw", nsfw.toString());
        if (excludeUserId !== undefined) formData.append("excludeUserId", excludeUserId.toString());
        if (requireUser !== undefined) formData.append("requireUser", requireUser.toString());
        if (isDraft !== undefined) formData.append("isDraft", isDraft.toString());

        // Append images
        if (hasImages) {
          images!.files.forEach((file) => {
            if (isBrowserFile(file)) {
              formData.append("images.files", file, file.name);
            } else {
              formData.append("images.files", {
                uri: file.uri,
                type: file.type || "image/jpeg",
                name: file.name,
              } as any);
            }
          });

          if (images!.options) {
            formData.append("images.options", JSON.stringify(images!.options));
          }
        }

        // Append files
        if (hasFiles) {
          files!.files.forEach((file) => {
            if (isBrowserFile(file)) {
              formData.append("files.files", file, file.name);
            } else {
              formData.append("files.files", {
                uri: file.uri,
                type: file.type || "application/octet-stream",
                name: file.name,
              } as any);
            }
          });

          if (files!.options) {
            formData.append("files.options", JSON.stringify(files!.options));
          }
        }

        // Make multipart request
        const response = await axios.post<Entity>(
          `/${projectId}/entities`,
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
          }
        );

        return response.data as Entity;
      } else {
        // EXISTING PATH: JSON request (unchanged)
        const response = await axios.post<Entity>(
          `/${projectId}/entities`,
          {
            foreignId,
            sourceId,
            spaceId,
            title,
            content,
            attachments,
            keywords,
            mentions,
            location,
            metadata,
            nsfw,
            excludeUserId,
            requireUser,
            isDraft,
          },
        );

        return response.data as Entity;
      }
    },
    [projectId, axios]
  );

  return createEntity;
}

export default useCreateEntity;
