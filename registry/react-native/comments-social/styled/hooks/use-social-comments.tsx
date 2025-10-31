import { ReactNode, useMemo } from "react";
import {
  CommentsSortByOptions,
  CommentSectionProvider,
  Entity,
} from "@replyke/core";
import { UIStateProvider } from "../context/ui-state-context";

// Components will be imported after they're created
import CommentsFeed from "../files/comments-feed/comments-feed";
import NewCommentForm from "../files/new-comment-form/new-comment-form";
import SortByButton from "../files/sort-by-button/sort-by-button";
import CommentOptionsSheet from "../files/sheets/comment-options-sheet";
import CommentOptionsSheetOwner from "../files/sheets/comment-options-sheet-owner";
import ReportCommentSheet from "../files/sheets/report-comment-sheet";

function useSocialComments({
  entity,
  entityId,
  foreignId,
  shortId,
  createIfNotFound,
  highlightedCommentId,
  theme = 'light',
  defaultSortBy,
  limit,
}: {
  entity?: Entity;
  entityId?: string | undefined | null;
  foreignId?: string | undefined | null;
  shortId?: string | undefined | null;
  createIfNotFound?: boolean;
  highlightedCommentId?: string | null;
  theme?: 'light' | 'dark';
  defaultSortBy?: CommentsSortByOptions;
  limit?: number;
}) {
  // 🔧 CUSTOMIZE: Callback handlers for user interactions
  // Replace these placeholder implementations with your own logic
  const callbacks = useMemo(() => ({
    // Called when a user tries to perform an action without being logged in
    loginRequiredCallback: () => {
      // 🔧 CUSTOMIZE: Handle login requirement
      // Example: navigation.navigate('Login')
      console.log("Please login to perform this action");
    },

    // Called when a user tries to perform an action without having a username set
    usernameRequiredCallback: () => {
      // 🔧 CUSTOMIZE: Handle username requirement
      // Example: navigation.navigate('ProfileSetup')
      console.log("Username required");
    },

    // Called when trying to mention a user who doesn't have a username
    userCantBeMentionedCallback: () => {
      // 🔧 CUSTOMIZE: Handle mention validation
      console.log("This user doesn't have a username and cannot be mentioned");
    },

    // Called when the current user clicks on their own avatar or name
    currentUserClickCallback: () => {
      // 🔧 CUSTOMIZE: Handle current user profile click
      // Example: navigation.navigate('Profile')
      console.log("Navigate to own profile");
    },

    // Called when clicking on another user's avatar or name
    // @param userId - The user's ID
    // @param foreignId - Optional foreign ID if the user has one
    otherUserClickCallback: (userId: string, foreignId: string | undefined) => {
      // 🔧 CUSTOMIZE: Handle other user profile click
      // Example: navigation.navigate('UserProfile', { userId })
      console.log(`Navigate to user ${userId} profile`, { foreignId });
    },
  }), []);

  const MemoizedCommentSectionProvider = useMemo(() => {
    return ({ children }: { children: ReactNode }) => (
      <CommentSectionProvider
        entity={entity}
        entityId={entityId}
        foreignId={foreignId}
        shortId={shortId}
        createIfNotFound={createIfNotFound}
        callbacks={callbacks as Record<string, (...args: any[]) => void>}
        defaultSortBy={defaultSortBy || "top"}
        limit={limit || 10}
        highlightedCommentId={highlightedCommentId}
      >
        <UIStateProvider theme={theme}>
          <>
            {children}
            <CommentOptionsSheet />
            <CommentOptionsSheetOwner />
            <ReportCommentSheet />
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
    theme,
  ]);

  return useMemo(() => ({
    CommentSectionProvider: MemoizedCommentSectionProvider,
    CommentsFeed,
    NewCommentForm,
    SortByButton,
  }), [MemoizedCommentSectionProvider]);
}

export default useSocialComments;
