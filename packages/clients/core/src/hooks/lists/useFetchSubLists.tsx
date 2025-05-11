import { useCallback } from "react";
import useAxiosPrivate from "../../config/useAxiosPrivate";
import { List } from "../../interfaces/models/List";
import useProject from "../projects/useProject";

function useFetchSubLists() {
  const axios = useAxiosPrivate();
  const { projectId } = useProject();

  const fetchSubLists = useCallback(
    async ({ listId }: { listId: string }) => {
      if (!projectId) {
        throw new Error("No projectId available.");
      }

      const response = await axios.get<List[]>(
        `/${projectId}/lists/${listId}/sub-lists`,
        { withCredentials: true }
      );

      return response.data as List[];
    },
    [axios, projectId]
  );

  return fetchSubLists;
}

export default useFetchSubLists;
