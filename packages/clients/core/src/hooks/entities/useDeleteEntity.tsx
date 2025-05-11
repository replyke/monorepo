import { useCallback } from "react";
import useAxiosPrivate from "../../config/useAxiosPrivate";
import useProject from "../projects/useProject";

function useDeleteEntity() {
  const axios = useAxiosPrivate();
  const { projectId } = useProject();

  const deleteEntity = useCallback(
    async ({ entityId }: { entityId: string }) => {
      if (!projectId) {
        throw new Error("No projectId available.");
      }

      if (!entityId) {
        throw new Error("No entityId provided.");
      }

      await axios.delete(`/${projectId}/entities/${entityId}`, {
        withCredentials: true,
      });
    },
    [projectId, axios]
  );

  return deleteEntity;
}

export default useDeleteEntity;
