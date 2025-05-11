import { useCallback } from "react";
import useAxiosPrivate from "../../config/useAxiosPrivate";
import useProject from "../projects/useProject";
import { Entity } from "../../interfaces/models/Entity";

function useUpvoteEntity() {
  const axios = useAxiosPrivate();
  const { projectId } = useProject();

  const upvoteEntity = useCallback(
    async ({ entityId }: { entityId: string }) => {
      if (!entityId) {
        throw new Error("No entity ID provided");
      }
      if (!projectId) {
        throw new Error("No projectId available");
      }
      const response = await axios.patch(
        `/${projectId}/entities/${entityId}/upvote`,
        {},
        { withCredentials: true }
      );
      return response.data as Entity;
    },
    [axios, projectId]
  );

  return upvoteEntity;
}

export default useUpvoteEntity;
