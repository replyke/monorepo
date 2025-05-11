import { useCallback } from "react";
import { List } from "../../interfaces/models/List";
import useAxiosPrivate from "../../config/useAxiosPrivate";
import useProject from "../projects/useProject";

function useUpdateList() {
  const axios = useAxiosPrivate();
  const { projectId } = useProject();

  const updateList = useCallback(
    async ({
      listId,
      update,
    }: {
      listId: string;
      update: Partial<{ name: string }>;
    }) => {
      if (!projectId) {
        throw new Error("No projectId available.");
      }

      const response = await axios.patch<List>(
        `/${projectId}/lists/${listId}`,
        {
          update,
        },
        { withCredentials: true }
      );

      return response.data as List;
    },
    [axios, projectId]
  );

  return updateList;
}

export default useUpdateList;
