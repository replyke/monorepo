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
  referenceId,
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
  referenceId?: string | undefined | null;
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
        referenceId={referenceId}
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
