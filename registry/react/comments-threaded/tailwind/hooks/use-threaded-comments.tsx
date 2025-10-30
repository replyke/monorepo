import { ReactNode, useMemo } from "react";
import {
  CommentsSortByOptions,
  CommentSectionProvider,
  Entity,
} from "@replyke/react-js";
import CommentsFeed from "../files/comments-feed/comments-feed";
import NewCommentForm from "../files/new-comment-form";
import CommentMenuModal from "../files/modals/comment-menu-modal/comment-menu-modal";
import CommentMenuModalOwner from "../files/modals/comment-menu-modal-owner/comment-menu-modal-owner";
import { UIStateProvider } from "../context/ui-state-context";
import { ThreadedStyleCallbacks } from "../files/threaded-comment-section";

function useThreadedComments({
  entity,
  entityId,
  foreignId,
  shortId,
  createIfNotFound,
  callbacks,
  defaultSortBy,
  limit,
  highlightedCommentId,
  theme = 'light',
}: {
  entity?: Entity | undefined | null;
  entityId?: string | undefined | null;
  foreignId?: string | undefined | null;
  shortId?: string | undefined | null;
  createIfNotFound?: boolean;
  callbacks?: ThreadedStyleCallbacks;
  defaultSortBy?: CommentsSortByOptions;
  limit?: number;
  highlightedCommentId?: string | null;
  theme?: 'light' | 'dark';
}) {
  const MemoizedCommentSectionProvider = useMemo(() => {
    return ({ children }: { children: ReactNode }) => (
      <CommentSectionProvider
        entity={entity}
        entityId={entityId}
        foreignId={foreignId}
        shortId={shortId}
        createIfNotFound={createIfNotFound}
        callbacks={callbacks as Record<string, (...args: any[]) => void>}
        defaultSortBy={defaultSortBy}
        limit={limit}
        highlightedCommentId={highlightedCommentId}
      >
        <UIStateProvider theme={theme}>
          <>
            {children}
            <CommentMenuModal />
            <CommentMenuModalOwner />
          </>
        </UIStateProvider>
      </CommentSectionProvider>
    );
  }, [
    entity,
    entityId,
    foreignId,
    shortId,
    createIfNotFound,
    callbacks,
    defaultSortBy,
    limit,
    highlightedCommentId,
    theme
  ]);

  return useMemo(() => ({
    CommentSectionProvider: MemoizedCommentSectionProvider,
    CommentsFeed,
    NewCommentForm,
  }), [MemoizedCommentSectionProvider]);
}

export default useThreadedComments;
