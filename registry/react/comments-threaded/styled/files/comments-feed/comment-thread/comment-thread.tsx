import { useEffect, useMemo, useState } from "react";
import {
  Comment as CommentType,
  useCommentSection,
  useReplies,
} from "@replyke/react-js";
import SingleComment from "./single-comment";
import CommentReplies from "./comment-replies";

export interface CommentThreadProps {
  comment: CommentType;
  depth: number;
  isLastReply?: boolean;
  onDeleteComment?: (commentId: string) => void;
  onReportComment?: (commentId: string) => void;
}

function CommentThread({
  comment,
  depth,
  isLastReply = false,
}: CommentThreadProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showAllReplies, setShowAllReplies] = useState(false);

  const { sortBy } = useCommentSection();

  const { replies, newReplies, loading, page, setPage } = useReplies({
    commentId: comment.id,
    sortBy: sortBy || "new", // Add fallback instead of assertion
  });

  useEffect(() => {
    // Reset the page when the comment changes
    setPage(1);
  }, [setPage]);

  const initialVisibleReplies = 3;

  const allReplies = useMemo(() => {
    const combined = [...(newReplies || []), ...(replies || [])];
    return combined;
  }, [newReplies, replies, comment.content]);

  const visibleReplies = useMemo(() => {
    const visible = showAllReplies
      ? allReplies
      : allReplies.slice(0, initialVisibleReplies);
    return visible;
  }, [showAllReplies, allReplies, initialVisibleReplies, comment.content]);

  const hiddenRepliesCount = Math.max(
    0,
    allReplies.length - initialVisibleReplies
  );

  const handleToggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleShowAllReplies = () => {
    setShowAllReplies(true);
  };

  const hasReplies = allReplies.length > 0;
  const replyCount = allReplies.length;

  return (
    <>
      <SingleComment
        comment={comment}
        depth={depth}
        hasReplies={hasReplies}
        isCollapsed={isCollapsed}
        replyCount={replyCount}
        isLastReply={isLastReply}
        onToggleCollapse={handleToggleCollapse}
      />

      <CommentReplies
        depth={depth}
        isCollapsed={isCollapsed}
        loading={loading}
        visibleReplies={visibleReplies}
        hiddenRepliesCount={hiddenRepliesCount}
        showAllReplies={showAllReplies}
        onShowAllReplies={handleShowAllReplies}
        CommentThreadComponent={CommentThread}
      />
    </>
  );
}

export default CommentThread;
