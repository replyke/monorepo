import { ReactNode } from "react";
import { CommentsSortByOptions, CommentSectionProvider } from "@replyke/react-js";
import {
  SocialStyleCallbacks,
  SocialStyleConfig,
  SocialStyleConfigProvider,
} from "@replyke/comments-social-core";
import { CommentsFeed, NewCommentForm, SortByButton } from "../components";
import { CommentMenuModal } from "../components/modals/CommentMenuModal";
import { CommentMenuModalOwner } from "../components/modals/CommentMenuModalOwner";
import { ModalManagerProvider } from "../context/ModalManagerContext";

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
          <ModalManagerProvider>
            <>
              {children}
              <CommentMenuModal />
              <CommentMenuModalOwner />
            </>
          </ModalManagerProvider>
        </SocialStyleConfigProvider>
      </CommentSectionProvider>
    ),
    CommentsFeed,
    NewCommentForm,
    SortByButton,
  };
}

export default useSocialComments;
