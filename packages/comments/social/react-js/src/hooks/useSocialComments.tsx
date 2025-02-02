import { ReactNode } from "react";
import { CommentsSortByOptions, CommentSectionProvider } from "@replyke/core";
import {
  SocialStyleCallbacks,
  SocialStyleConfig,
  SocialStyleConfigProvider,
} from "@replyke/comments-social-core";
import { CommentsFeed, NewCommentForm, SortByButton } from "..";
import { CommentMenuModal } from "../components/modals/CommentMenuModal";
import { CommentMenuModalOwner } from "../components/modals/CommentMenuModalOwner";

function useSocialComments({
  entityId,
  callbacks,
  defaultSortBy,
  limit,
  styleConfig,
  highlightedCommentId,
}: {
  entityId: string | null | undefined;
  callbacks?: SocialStyleCallbacks;
  defaultSortBy?: CommentsSortByOptions;
  limit?: number;
  styleConfig: SocialStyleConfig;
  highlightedCommentId?: string | null;
}) {
  return {
    CommentSectionProvider: ({ children }: { children: ReactNode }) => (
      <CommentSectionProvider
        entityId={entityId}
        callbacks={callbacks}
        defaultSortBy={defaultSortBy}
        limit={limit}
        highlightedCommentId={highlightedCommentId}
      >
        <SocialStyleConfigProvider styleConfig={styleConfig}>
          <>
            {children}
            <CommentMenuModal />
            <CommentMenuModalOwner />
          </>
        </SocialStyleConfigProvider>
      </CommentSectionProvider>
    ),
    CommentsFeed,
    NewCommentForm,
    SortByButton,
  };
}

export default useSocialComments;
