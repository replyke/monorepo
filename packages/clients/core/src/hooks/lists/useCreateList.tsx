import { useCallback } from "react";
import useAxiosPrivate from "../../config/useAxiosPrivate";
import { List } from "../../interfaces/models/List";
import useProject from "../projects/useProject";

function useCreateList() {
  const axios = useAxiosPrivate();
  const { projectId } = useProject();

  const createList = useCallback(
    async ({
      listName,
      parentListId,
    }: {
      listName: string;
      parentListId: string;
    }) => {
      if (!projectId) {
        throw new Error("No projectId available.");
      }

      const response = await axios.post<List>(
        `/${projectId}/lists/${parentListId}/sub-lists`,
        {
          listName,
        },
        { withCredentials: true }
      );

      return response.data as List;
    },
    [axios, projectId]
  );

  return createList;
}
export default useCreateList;
