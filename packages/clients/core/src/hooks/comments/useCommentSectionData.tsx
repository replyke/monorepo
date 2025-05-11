import { useCallback, useEffect, useRef, useState } from "react";
import { Comment, GifData } from "../../interfaces/models/Comment";
import { EntityCommentsTree } from "../../interfaces/EntityCommentsTree";

import { CommentsSortByOptions } from "../../interfaces/CommentsSortByOptions";
import { User } from "../../interfaces/models/User";
import useCreateComment from "./useCreateComment";
import { Mention } from "../../interfaces/models/Mention";
import { handleError } from "../../utils/handleError";
import useDeleteComment from "./useDeleteComment";
import useUpdateComment from "./useUpdateComment";
import useEntityComments from "./useEntityComments";
import useFetchComment from "./useFetchComment";
import useUser from "../users/useUser";
import { Entity } from "../../interfaces/models/Entity";

import {
  useFetchEntity,
  useFetchEntityByForeignId,
  useFetchEntityByShortId,
} from "../entities";

export interface UseCommentSectionDataProps {
  entity?: Entity;
  entityId?: string | undefined | null;
  foreignId?: string | undefined | null;
  shortId?: string | undefined | null;
  createIfNotFound?: boolean;

  callbacks?: Record<string, (...args: any[]) => void> | undefined;
  limit?: number;
  defaultSortBy?: CommentsSortByOptions;
  highlightedCommentId?: string | null;
}

export interface UseCommentSectionDataValues {
  entity: Entity | null | undefined;
  callbacks?: Record<string, (...args: any[]) => void> | undefined;
  entityCommentsTree: EntityCommentsTree;
  comments: Comment[];
  newComments: Comment[];
  highlightedComment: {
    comment: Comment;
    parentComment: Comment | null;
  } | null;
  loading: boolean;
  hasMore: boolean;
  submittingComment: boolean;
  loadMore: () => void;
  sortBy: CommentsSortByOptions | null;
  setSortBy: (newSortBy: CommentsSortByOptions) => void;
  pushMention: User | null;
  selectedComment: Comment | null;
  setSelectedComment: (newSelectedComment: Comment | null) => void;
  repliedToComment: Partial<Comment> | null;
  setRepliedToComment: (newRepliedToComment: Comment | null) => void;
  showReplyBanner: boolean;
  setShowReplyBanner: (newState: boolean) => void;
  addCommentsToTree: (
    newComments: Comment[] | undefined,
    newlyAdded?: boolean
  ) => void;
  removeCommentFromTree: (commentId: string) => void;
  handleDeepReply: (comment: Comment) => void;
  handleShallowReply: (comment: Comment) => void;

  createComment: (props: {
    content?: string;
    gif?: GifData;
    mentions: Mention[];
  }) => Promise<void>;
  updateComment: (props: {
    commentId: string;
    content: string;
  }) => Promise<void>;
  deleteComment: (props: { commentId: string }) => Promise<void>;
}

function useCommentSectionData(
  props: UseCommentSectionDataProps
): UseCommentSectionDataValues {
  const {
    entity: entityProp,
    entityId,
    foreignId,
    shortId,
    createIfNotFound,

    defaultSortBy = "top" as CommentsSortByOptions,
    limit = 15,
    callbacks = {},
    highlightedCommentId,
  } = props;

  const [entity, setEntity] = useState<Entity | undefined>(entityProp);

  const { user } = useUser();
  const {
    entityCommentsTree,
    comments,
    newComments,
    loading: loadingState, // we use the state to trigger renders
    hasMore: hasMoreState,
    sortBy,
    setSortBy,
    loadMore,
    addCommentsToTree,
    removeCommentFromTree,
  } = useEntityComments({ entityId: entity?.id, defaultSortBy, limit });

  const createComment = useCreateComment();
  const deleteComment = useDeleteComment();
  const updateComment = useUpdateComment();
  const fetchComment = useFetchComment();
  const fetchEntity = useFetchEntity();
  const fetchEntityByForeignId = useFetchEntityByForeignId();
  const fetchEntityByShortId = useFetchEntityByShortId();

  const [highlightedComment, setHighlightedComment] = useState<{
    comment: Comment;
    parentComment: Comment | null;
  } | null>(null);
  const fetchingCommentIdRef = useRef<string | null>(null);
  const fetchedStatus = useRef<Record<string, boolean>>({}); // Track status by unique key

  const submittingComment = useRef(false);
  const [submittingCommentState, setSubmittingCommentState] = useState(false); // required to trigger rerenders

  const [pushMention, setPushMention] = useState<null | User>(null);
  // const previousPushMention = useRef<null | User>(null);

  const [repliedToComment, setRepliedToComment] =
    useState<Partial<Comment> | null>(null);
  const [showReplyBanner, setShowReplyBanner] = useState(false);
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null);

  // const handleSetPushMention = (user: User | null) => {
  //   console.log("handleSetPushMention called");
  //   if(!user?.username)
  //   console.log("handleSetPushMention is valid");

  //   setPushMention((prevMention) => {
  //     if (JSON.stringify(prevMention) === JSON.stringify(user)) {
  //       return prevMention;
  //     }
  //     return user;
  //   });
  // };

  // For replies that appear as a child of the comment they are replying to.
  const handleDeepReply = useCallback(
    (comment: Comment) => {
      setRepliedToComment!(comment);
      setShowReplyBanner(true);
    },
    [setRepliedToComment]
  );

  // For replies that appear at the same level as the comment they are replying to. Includes a mention (e.g. @username).
  const handleShallowReply = useCallback(
    (comment: Comment) => {
      setRepliedToComment!({ id: comment.parentId ?? undefined });
      setPushMention(comment.user);
    },
    [setRepliedToComment]
  );

  const handleCreateComment = useCallback(
    async (props: {
      content?: string;
      gif?: GifData;
      mentions?: Mention[];
    }) => {
      const { content, gif, mentions } = props;

      if (submittingComment.current) return;

      if (!entity) {
        console.error("Invalid entity in useCommentSection");
        return;
      }

      if (!user) {
        throw new Error("No user is authenticated");
      }

      if (callbacks?.usernameRequiredCallback && !user.username) {
        callbacks?.usernameRequiredCallback();
        return;
      }

      if (!gif && (!content || content.length === 1)) {
        throw new Error("Comment is too short");
      }

      submittingComment.current = true;
      setSubmittingCommentState(true);

      // Filter mentions to include only those with "@username" in the content
      const filteredMentions = content
        ? (mentions || []).filter((mention) => {
            const mentionRegex = new RegExp(`@${mention.username}\\b`, "g");
            // const mentionRegex = new RegExp(
            //   `@(${mention.username}|${mention.name})\\b`,
            //   "g"
            // );

            return mentionRegex.test(content);
          })
        : [];

      const TEMP_ID = Math.random().toString(36).substring(2, 7);

      const tempNewComment: Comment = {
        projectId: "TEMP_PROJECT_ID",
        foreignId: null,
        entityId: entity.id,
        content: content ?? null,
        gif: gif ?? null,
        mentions: filteredMentions,
        parentId: repliedToComment?.id || null,
        id: TEMP_ID,
        userId: user.id,
        user: {
          ...user,
          bio: null,
          birthdate: new Date(),
          location: null,
          createdAt: new Date(),
        } as User,
        upvotes: [],
        downvotes: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        parentDeletedAt: null,
        repliesCount: 0,
      };

      addCommentsToTree([tempNewComment], true);
      setRepliedToComment(null);
      setShowReplyBanner(false);
      setPushMention(null);

      try {
        const newCommentData = await createComment({
          entityId: entity.id,
          parentCommentId: repliedToComment?.id,
          content,
          gif,
          mentions: filteredMentions,
        });

        if (newCommentData) {
          removeCommentFromTree(TEMP_ID);
          addCommentsToTree([newCommentData], true);
        }
      } catch (err: unknown) {
        // TODO: currently we remove the temp comment from the tree but don't offer the user any option to retry. It's as if they've never sent anything and all they typed is gone. We need to add a flag for comment in the tree that says t failed so we can give he user a try again button
        removeCommentFromTree(TEMP_ID);
        handleError(err, "Failed to submit a new comment: ");
      } finally {
        submittingComment.current = false;
        setSubmittingCommentState(false);
      }
    },
    [
      user,
      addCommentsToTree,
      removeCommentFromTree,
      entity,
      createComment,
      repliedToComment,
      callbacks,
    ]
  );

  const handleDeleteComment = useCallback(
    async ({ commentId }: { commentId: string }) => {
      try {
        removeCommentFromTree(commentId);
        await deleteComment({ commentId });
      } catch (err) {
        handleError(err, "Failed to delete comment");
      }
    },
    [deleteComment, removeCommentFromTree]
  );

  const handleUpdateComment = useCallback(
    async ({ commentId, content }: { commentId: string; content: string }) => {
      try {
        const updatedComment = await updateComment({ commentId, content });

        if (updatedComment) {
          console.log("update comment in tree. Implement!");
        }
      } catch (err) {
        handleError(err, "Failed to update comment");
      }
    },
    [updateComment]
  );

  useEffect(() => {
    const handleFetchSingleComment = async () => {
      if (fetchingCommentIdRef.current === highlightedCommentId) {
        return; // Skip if already fetching for this comment ID
      }

      fetchingCommentIdRef.current = highlightedCommentId!;

      try {
        const fetchedCommentData = await fetchComment({
          commentId: highlightedCommentId!,
          withParent: true,
        });

        if (!fetchedCommentData) {
          console.error("Issue fetching single comment comment not found");
          return;
        }

        if (!fetchedCommentData.comment) {
          console.error("Highlighted comment not found");
        }

        setHighlightedComment(fetchedCommentData);
        const { comment: targetComment, parentComment } = fetchedCommentData;

        addCommentsToTree?.(
          parentComment ? [targetComment, parentComment] : [targetComment]
        );
      } catch (err) {
        handleError(err, "Fetching single comment failed");
      }
    };

    if (highlightedCommentId) {
      handleFetchSingleComment();
    }
  }, [highlightedCommentId, fetchComment, addCommentsToTree]);

  useEffect(() => {
    const handleFetchEntity = async () => {
      if (!foreignId && !entityId && !shortId) return;

      if (entity && entityId && entity.id === entityId) return;
      if (entity && foreignId && entity.foreignId === foreignId) return;
      if (entity && shortId && entity.shortId === shortId) return;

      const uniqueKey = `${entityId ?? ""}-${foreignId ?? ""}-${shortId ?? ""}`;

      if (fetchedStatus.current[uniqueKey]) return;

      fetchedStatus.current[uniqueKey] = true;

      try {
        let fetchedEntity: Entity | null = null;
        if (entityId) {
          fetchedEntity = await fetchEntity({
            entityId,
          });
        } else if (foreignId) {
          fetchedEntity = await fetchEntityByForeignId({
            foreignId,
            createIfNotFound,
          });
        } else if (shortId) {
          fetchedEntity = await fetchEntityByShortId({
            shortId,
          });
        }
        if (fetchedEntity) setEntity(fetchedEntity);
      } catch (err) {
        handleError(err, "Fetching entity failed");
      }
    };

    handleFetchEntity();
  }, [
    fetchEntity,
    fetchEntityByForeignId,
    fetchEntityByShortId,
    entityId,
    foreignId,
    shortId,
    entity,
    createIfNotFound,
  ]);

  return {
    entity,
    callbacks,

    entityCommentsTree,
    comments,
    newComments,
    highlightedComment,

    loading: loadingState, // we use the state to trigger renders
    hasMore: hasMoreState,
    submittingComment: submittingCommentState,

    loadMore,
    sortBy,
    setSortBy,
    pushMention,
    selectedComment,
    setSelectedComment,
    repliedToComment,
    setRepliedToComment,
    showReplyBanner,
    setShowReplyBanner,

    addCommentsToTree,
    removeCommentFromTree,

    handleShallowReply,
    handleDeepReply,

    createComment: handleCreateComment,
    updateComment: handleUpdateComment,
    deleteComment: handleDeleteComment,
  };
}

export default useCommentSectionData;
