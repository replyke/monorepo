import React, { createContext, useState, useMemo, useCallback } from "react";
import { Comment as CommentType } from "@replyke/react-js";

type UIStateContext = {
  isCommentOptionsModalOpen: boolean;
  isCommentOptionsModalOwnerOpen: boolean;

  openCommentOptionsModal: (newComment?: CommentType) => void;
  closeCommentOptionsModal: () => void;
  openCommentOptionsModalOwner: (newComment?: CommentType) => void;
  closeCommentOptionsModalOwner: () => void;

  optionsComment: CommentType | null;
  setOptionsComment: React.Dispatch<React.SetStateAction<CommentType | null>>;

  theme: 'light' | 'dark';
};

export const UIStateContext = createContext<Partial<UIStateContext>>(
  {}
);

export const UIStateProvider = ({
  children,
  theme = 'light',
}: {
  children: React.ReactNode;
  theme?: 'light' | 'dark';
}) => {
  const [isCommentOptionsModalOpen, setIsCommentOptionsModalOpen] =
    useState(false);
  const [isCommentOptionsModalOwnerOpen, setIsCommentOptionsModalOwnerOpen] =
    useState(false);

  const [optionsComment, setOptionsComment] = useState<CommentType | null>(
    null
  );

  const openCommentOptionsModal = useCallback((newComment?: CommentType) => {
    if (newComment) setOptionsComment(newComment);
    setIsCommentOptionsModalOpen(true);
  }, []);

  const closeCommentOptionsModal = useCallback(() => {
    setIsCommentOptionsModalOpen(false);
    setOptionsComment(null);
  }, []);

  const openCommentOptionsModalOwner = useCallback((newComment?: CommentType) => {
    if (newComment) setOptionsComment(newComment);
    setIsCommentOptionsModalOwnerOpen(true);
  }, []);

  const closeCommentOptionsModalOwner = useCallback(() => {
    setIsCommentOptionsModalOwnerOpen(false);
    setOptionsComment(null);
  }, []);

  const contextValue = useMemo(() => ({
    isCommentOptionsModalOpen,
    isCommentOptionsModalOwnerOpen,

    openCommentOptionsModal,
    closeCommentOptionsModal,
    openCommentOptionsModalOwner,
    closeCommentOptionsModalOwner,

    optionsComment,
    setOptionsComment,

    theme,
  }), [
    isCommentOptionsModalOpen,
    isCommentOptionsModalOwnerOpen,
    openCommentOptionsModal,
    closeCommentOptionsModal,
    openCommentOptionsModalOwner,
    closeCommentOptionsModalOwner,
    optionsComment,
    theme,
  ]);

  return (
    <UIStateContext.Provider value={contextValue}>
      {children}
    </UIStateContext.Provider>
  );
};
