import { useCallback } from "react";
import useAxiosPrivate from "../../config/useAxiosPrivate";
import useProject from "../projects/useProject";
import { Entity } from "../../interfaces/models/Entity";

function useRemoveEntityDownvote() {
  const axios = useAxiosPrivate();
  const { projectId } = useProject();

  const removeEntityDownvote = useCallback(
    async ({ entityId }: { entityId: string }) => {
      if (!entityId) {
        throw new Error("No entity ID provided");
      }
      if (!projectId) {
        throw new Error("No projectId available");
      }
      const response = await axios.patch(
        `/${projectId}/entities/${entityId}/remove-downvote`,
        {},
        { withCredentials: true }
      );
      return response.data as Entity;
    },
    [axios, projectId]
  );

  return removeEntityDownvote;
}

export default useRemoveEntityDownvote;
