import { ReactNode, useMemo } from "react";
import {
  CommentSectionProvider,
  Entity,
} from "@replyke/react-js";
import CommentsFeed from "../files/comments-feed/comments-feed";
import NewCommentForm from "../files/new-comment-form";
import CommentMenuModal from "../files/modals/comment-menu-modal/comment-menu-modal";
import CommentMenuModalOwner from "../files/modals/comment-menu-modal-owner/comment-menu-modal-owner";
import { UIStateProvider } from "../context/ui-state-context";

function useThreadedComments({
  entity,
  entityId,
  foreignId,
  shortId,
  createIfNotFound,
  highlightedCommentId,
}: {
  entity?: Entity | undefined | null;
  entityId?: string | undefined | null;
  foreignId?: string | undefined | null;
  shortId?: string | undefined | null;
  createIfNotFound?: boolean;
  highlightedCommentId?: string | null;
}) {

  // 🔧 CUSTOMIZE: Callback handlers for user interactions
  // Replace these placeholder implementations with your own logic
  const callbacks = useMemo(
    () => ({
      // Called when a user tries to perform an action without being logged in
      loginRequiredCallback: () => {
        // 🔧 CUSTOMIZE: Handle login requirement
        // Example: router.push('/login?redirect=' + window.location.pathname)
        alert("Please login to perform this action");
      },

      // Called when a user with no username tries to interact with comments
      usernameRequiredCallback: () => {
        // 🔧 CUSTOMIZE: Handle username requirement
        // Example: router.push('/profile/setup')
        alert("Please set a username before interacting with comments");
      },

      // Called when a user tries to submit an empty comment or reply
      commentTooShortCallback: () => {
        // 🔧 CUSTOMIZE: Handle empty comment validation
        alert("Comment cannot be empty");
      },

      // Called when trying to mention a user who doesn't have a username
      userCantBeMentionedCallback: () => {
        // 🔧 CUSTOMIZE: Handle invalid mention attempt
        alert("This user cannot be mentioned (no username set)");
      },

      // Called when the current user clicks on their own avatar or name
      currentUserClickCallback: () => {
        // 🔧 CUSTOMIZE: Handle current user profile click
        // Example: router.push('/profile')
        console.log("Navigate to own profile");
      },

      // Called when clicking on another user's avatar or name
      // @param userId - The user's ID
      // @param foreignId - Optional foreign ID if the user has one
      otherUserClickCallback: (
        userId: string,
        foreignId: string | undefined
      ) => {
        // 🔧 CUSTOMIZE: Handle other user profile click
        // Example: router.push(`/users/${userId}`)
        console.log(`Navigate to user ${userId} profile`, { foreignId });
      },
    }),
    []
  );
  const MemoizedCommentSectionProvider = useMemo(() => {
    return ({ children }: { children: ReactNode }) => (
      <CommentSectionProvider
        entity={entity}
        entityId={entityId}
        foreignId={foreignId}
        shortId={shortId}
        createIfNotFound={createIfNotFound}
        callbacks={callbacks as Record<string, (...args: any[]) => void>}
        defaultSortBy="top"
        limit={10}
        highlightedCommentId={highlightedCommentId}
      >
        <UIStateProvider>
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
    highlightedCommentId
  ]);

  return useMemo(() => ({
    CommentSectionProvider: MemoizedCommentSectionProvider,
    CommentsFeed,
    NewCommentForm,
  }), [MemoizedCommentSectionProvider]);
}

export default useThreadedComments;
