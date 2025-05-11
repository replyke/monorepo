import { useCallback } from "react";
import useAxiosPrivate from "../../config/useAxiosPrivate";
import useProject from "../projects/useProject";

function useDeleteComment() {
  const axios = useAxiosPrivate();
  const { projectId } = useProject();

  const deleteComment = useCallback(
    async ({ commentId }: { commentId: string }) => {
      if (!commentId) {
        throw new Error("No comment ID passed");
      }

      if (!projectId) {
        throw new Error("No project specified");
      }

      await axios.delete(`/${projectId}/comments/${commentId}`);
    },
    [axios, projectId]
  );
  return deleteComment;
}

export default useDeleteComment;
