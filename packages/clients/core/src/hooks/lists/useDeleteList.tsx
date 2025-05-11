import { useCallback } from "react";
import useAxiosPrivate from "../../config/useAxiosPrivate";
import useProject from "../projects/useProject";

function useDeleteList() {
  const axios = useAxiosPrivate();
  const { projectId } = useProject();

  const deleteList = useCallback(
    async ({ listId }: { listId: string }) => {

      if (!projectId) {
        throw new Error("No projectId available.");
      }

      await axios.delete(`/${projectId}/lists/${listId}`, {
        withCredentials: true,
      });
    },
    [axios, projectId]
  );

  return deleteList;
}

export default useDeleteList;
