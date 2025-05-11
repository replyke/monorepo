import { ReactNode } from "react";
import {
  CommentsSortByOptions,
  CommentSectionProvider,
  Entity,
} from "@replyke/core";
import {
  SocialStyleCallbacks,
  SocialStyleConfig,
  SocialStyleConfigProvider,
} from "@replyke/comments-social-core";
import { CommentsFeed, NewCommentForm, SortByButton } from "..";
import CommentOptionsSheet from "../components/sheets/CommentOptionsSheet";
import ReportCommentSheet from "../components/sheets/ReportCommentSheet";
import { SheetManagerProvider } from "../context/SheetManagerContext";

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
  styleConfig: SocialStyleConfig;
  createIfNotFound?: boolean;
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
          <SheetManagerProvider>
            <>
              {children}
              <CommentOptionsSheet />
              <ReportCommentSheet />
            </>
          </SheetManagerProvider>
        </SocialStyleConfigProvider>
      </CommentSectionProvider>
    ),
    CommentsFeed,
    NewCommentForm,
    SortByButton,
  };
}

export default useSocialComments;
