import { useCallback } from "react";
import useAxiosPrivate from "../../config/useAxiosPrivate";
import { List } from "../../interfaces/models/List";
import useProject from "../projects/useProject";

function useRemoveFromList() {
  const axios = useAxiosPrivate();
  const { projectId } = useProject();

  const removeFromList = useCallback(
    async ({
      entityId,
      listId,
    }: {
      entityId: string;
      listId: string;
    }) => {
      if (!projectId) {
        throw new Error("No projectId available.");
      }

      const response = await axios.patch<List>(
        `/${projectId}/lists/${listId}/remove-entity`,
        {
          entityId,
        },
        { withCredentials: true }
      );

      return response.data as List;
    },
    [projectId, axios]
  );

  return removeFromList;
}

export default useRemoveFromList;
