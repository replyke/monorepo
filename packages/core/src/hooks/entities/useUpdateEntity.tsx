import { useCallback, useRef } from "react";
import useAxiosPrivate from "../../config/useAxiosPrivate";
import useProject from "../projects/useProject";
import { Entity } from "../../interfaces/models/Entity";
import { Mention } from "../../interfaces/models/Mention";
import useEntity from "./useEntity";

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
    nsfw?: boolean;
  };
}

function useUpdateEntity(): (props: UpdateEntityProps) => Promise<Entity> {
  const axios = useAxiosPrivate();
  const { projectId } = useProject();
  const { setEntity } = useEntity();

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
        nsfw,
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
          nsfw,
        },
      );

      const updatedEntity = response.data as Entity;
      setEntity?.(updatedEntity);
      return updatedEntity;
    },
    [projectId, axios],
  );

  return updateEntity;
}

export default useUpdateEntity;
