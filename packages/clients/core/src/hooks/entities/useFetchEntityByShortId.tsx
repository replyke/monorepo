import { useCallback } from "react";
import useProject from "../projects/useProject";
import { Entity } from "../../interfaces/models/Entity";
import axios from "../../config/axios";

function useFetchEntityByShortId() {
  const { projectId } = useProject();

  const fetchEntityByShortId = useCallback(
    async ({ shortId }: { shortId: string }) => {
      if (!projectId) {
        throw new Error("No projectId available.");
      }

      if (!shortId) {
        throw new Error("Please pass shortId");
      }

      const response = await axios.get(`/${projectId}/entities/by-short-id`, {
        params: {
          shortId,
        },
      });

      return response.data as Entity;
    },
    [projectId]
  );

  return fetchEntityByShortId;
}

export default useFetchEntityByShortId;
