import { useCallback } from "react";
import useAxiosPrivate from "../../config/useAxiosPrivate";
import useProject from "../projects/useProject";
import { Comment, GifData } from "../../interfaces/models/Comment";
import { Mention } from "../../interfaces/models/Mention";
import useUser from "../users/useUser";

// Hook for adding a comment
function useCreateComment() {
  const axios = useAxiosPrivate();
  const { projectId } = useProject();
  const { user } = useUser();

  const createComment = useCallback(
    async (props: {
      entityId: string;
      foreignId?: string | null | undefined;
      parentCommentId?: string | null | undefined;
      content?: string;
      gif?: GifData;
      mentions?: Mention[];
      referencedCommentId?: string | null | undefined;
      attachments?: Record<string, any>[];
      metadata?: Record<string, any>;
    }) => {
      const {
        entityId,
        foreignId,
        parentCommentId,
        content,
        gif,
        mentions,
        referencedCommentId,
        attachments,
        metadata,
      } = props;
      if (!projectId) {
        throw new Error("No project specified");
      }

      if (!entityId) {
        throw new Error("No entity ID was provided");
      }

      if (!user) {
        throw new Error("No authenticated user");
      }

      if (!content && !gif) {
        throw new Error("No content was provided");
      }

      const response = await axios.post(`/${projectId}/comments`, {
        entityId,
        foreignId,
        content,
        gif,
        mentions,
        parentId: parentCommentId,
        referencedCommentId,
        attachments,
        metadata,
      });
      return response.data as Comment;
    },
    [projectId, user, axios]
  );

  return createComment;
}

export default useCreateComment;
