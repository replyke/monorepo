import { useCallback } from "react";
import useProject from "../projects/useProject";
import { Entity } from "../../interfaces/models/Entity";
import axios from "../../config/axios";

function useFetchEntity() {
  const { projectId } = useProject();

  const fetchEntity = useCallback(
    async ({ entityId }: { entityId: string }) => {
      if (!projectId) {
        throw new Error("No projectId available.");
      }

      if (!entityId) {
        throw new Error("Please pass an entityId");
      }

      const response = await axios.get(`/${projectId}/entities/${entityId}`);

      return response.data as Entity;
    },
    [projectId]
  );

  return fetchEntity;
}

export default useFetchEntity;
