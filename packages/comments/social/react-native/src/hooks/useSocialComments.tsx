import { ReactNode } from "react";
import {
  SocialStyleCallbacks,
  CommentsSortByOptions,
  CommentSectionProvider,
  SocialStyleConfig,
  SocialStyleConfigProvider,
  Entity,
} from "replyke-core";
import { CommentsFeed, NewCommentForm, SortByButton } from "..";
import CommentOptionsSheet from "../../../../../../comments/social/react-native/src/components/sheets/CommentOptionsSheet";
import ReportCommentSheet from "../../../../../../comments/social/react-native/src/components/sheets/ReportCommentSheet";

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
          <>
            {children}
            <CommentOptionsSheet />
            <ReportCommentSheet />
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
