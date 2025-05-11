import { useCallback } from "react";
import useAxiosPrivate from "../../config/useAxiosPrivate";
import { Entity } from "../../interfaces/models/Entity";
import useProject from "../projects/useProject";
import { Mention } from "../../interfaces/models/Mention";

function useCreateEntity() {
  const axios = useAxiosPrivate();
  const { projectId } = useProject();

  const createEntity = useCallback(
    async (props: {
      foreignId?: string;
      sourceId?: string;
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
      excludeUserId?: boolean;
    }) => {
      const {
        foreignId,
        sourceId,
        title,
        content,
        attachments,
        keywords,
        mentions,
        location,
        metadata,
        excludeUserId,
      } = props;

      if (!projectId) {
        throw new Error("No projectId available.");
      }

      const response = await axios.post<Entity>(
        `/${projectId}/entities`,
        {
          foreignId,
          sourceId,
          title,
          content,
          attachments,
          keywords,
          mentions,
          location,
          metadata,
          excludeUserId,
        },
        { withCredentials: true }
      );

      return response.data as Entity;
    },
    [projectId, axios]
  );

  return createEntity;
}

export default useCreateEntity;
