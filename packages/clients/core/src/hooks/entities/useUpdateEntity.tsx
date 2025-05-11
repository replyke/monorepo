import { useCallback, useRef } from "react";
import useAxiosPrivate from "../../config/useAxiosPrivate";
import useProject from "../projects/useProject";
import { Entity } from "../../interfaces/models/Entity";
import { Mention } from "../../interfaces/models/Mention";

export interface UpdateEntityProps {
  entityId: string;
  update: {
    title?: string | null | undefined;
    content?: string | null | undefined;
    attachments?: Record<string, any>[];
    keywords?: string[];
    location?: {
      latitude: number;
      longitude: number;
    };
    metadata?: Record<string, any>;
    mentions?: Mention[];
  };
}

function useUpdateEntity() {
  const axios = useAxiosPrivate();
  const { projectId } = useProject();

  const updateEntity = useCallback(
    async (props: UpdateEntityProps) => {
      const { entityId, update } = props;
      const {
        title,
        content,
        attachments,
        keywords,
        location,
        metadata,
        mentions,
      } = update;

      if (!projectId) {
        throw new Error("No projectId available.");
      }

      const response = await axios.patch(
        `/${projectId}/entities/${entityId}`,
        {
          title,
          content,
          attachments,
          keywords,
          location,
          metadata,
          mentions,
        },
        { withCredentials: true }
      );

      return response.data as Entity;
    },
    [projectId, axios]
  );

  return updateEntity;
}

export default useUpdateEntity;
