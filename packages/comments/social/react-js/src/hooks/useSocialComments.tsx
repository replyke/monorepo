import { ReactNode } from "react";
import {
  CommentsSortByOptions,
  CommentSectionProvider,
  Entity,
} from "@replyke/react-js";
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
  entity,
  entityId,
  foreignId,
  shortId,
  createIfNotFound,
  styleConfig,
  callbacks,
  defaultSortBy,
  limit,
  highlightedCommentId,
}: {
  entity?: Entity;
  entityId?: string | undefined | null;
  foreignId?: string | undefined | null;
  shortId?: string | undefined | null;
  createIfNotFound?: boolean;
  styleConfig: SocialStyleConfig;
  callbacks?: SocialStyleCallbacks;
  defaultSortBy?: CommentsSortByOptions;
  limit?: number;
  highlightedCommentId?: string | null;
}) {
  return {
    CommentSectionProvider: ({ children }: { children: ReactNode }) => (
      <CommentSectionProvider
        entity={entity}
        entityId={entityId}
        foreignId={foreignId}
        shortId={shortId}
        createIfNotFound={createIfNotFound}
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
