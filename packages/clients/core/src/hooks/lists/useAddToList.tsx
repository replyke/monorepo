import { useCallback } from "react";
import useAxiosPrivate from "../../config/useAxiosPrivate";
import { List } from "../../interfaces/models/List";
import useProject from "../projects/useProject";

function useAddToList() {
  const axios = useAxiosPrivate();
  const { projectId } = useProject();

  const addToList = useCallback(
    async ({ entityId, listId }: { entityId: string; listId: string }) => {
      if (!projectId) {
        throw new Error("No projectId available.");
      }

      const response = await axios.patch(
        `/${projectId}/lists/${listId}/add-entity`,
        {
          entityId,
        },
        { withCredentials: true }
      );

      return response.data as List;
    },
    [axios, projectId]
  );

  return addToList;
}

export default useAddToList;
