import { useCallback } from "react";
import useProject from "../projects/useProject";
import { Entity } from "../../interfaces/models/Entity";
import axios from "../../config/axios";

function useFetchEntityByForeignId() {
  const { projectId } = useProject();

  const fetchEntityByForeignId = useCallback(
    async ({
      foreignId,
      createIfNotFound,
    }: {
      foreignId: string;
      createIfNotFound?: boolean;
    }) => {
      if (!projectId) {
        throw new Error("No projectId available.");
      }

      if (!foreignId) {
        throw new Error("Please pass foreignId");
      }

      const response = await axios.get(`/${projectId}/entities/by-foreign-id`, {
        params: {
          foreignId,
          createIfNotFound,
        },
      });

      return response.data as Entity;
    },
    [projectId]
  );

  return fetchEntityByForeignId;
}

export default useFetchEntityByForeignId;
