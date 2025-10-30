import React, { createContext, useState, useMemo, useCallback } from "react";
import { Comment as CommentType } from "@replyke/react-js";

type UIStateContext = {
  isCommentMenuModalOpen: boolean;
  isCommentMenuModalOwnerOpen: boolean;

  openCommentMenuModal: (newComment?: CommentType) => void;
  closeCommentMenuModal: () => void;
  openCommentMenuModalOwner: (newComment?: CommentType) => void;
  closeCommentMenuModalOwner: () => void;

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
  const [isCommentMenuModalOpen, setIsCommentMenuModalOpen] =
    useState(false);
  const [isCommentMenuModalOwnerOpen, setIsCommentMenuModalOwnerOpen] =
    useState(false);

  const [optionsComment, setOptionsComment] = useState<CommentType | null>(
    null
  );

  const openCommentMenuModal = useCallback((newComment?: CommentType) => {
    if (newComment) setOptionsComment(newComment);
    setIsCommentMenuModalOpen(true);
  }, []);

  const closeCommentMenuModal = useCallback(() => {
    setIsCommentMenuModalOpen(false);
    setOptionsComment(null);
  }, []);

  const openCommentMenuModalOwner = useCallback((newComment?: CommentType) => {
    if (newComment) setOptionsComment(newComment);
    setIsCommentMenuModalOwnerOpen(true);
  }, []);

  const closeCommentMenuModalOwner = useCallback(() => {
    setIsCommentMenuModalOwnerOpen(false);
    setOptionsComment(null);
  }, []);

  const contextValue = useMemo(() => ({
    isCommentMenuModalOpen,
    isCommentMenuModalOwnerOpen,

    openCommentMenuModal,
    closeCommentMenuModal,
    openCommentMenuModalOwner,
    closeCommentMenuModalOwner,

    optionsComment,
    setOptionsComment,

    theme,
  }), [
    isCommentMenuModalOpen,
    isCommentMenuModalOwnerOpen,
    openCommentMenuModal,
    closeCommentMenuModal,
    openCommentMenuModalOwner,
    closeCommentMenuModalOwner,
    optionsComment,
    theme,
  ]);

  return (
    <UIStateContext.Provider value={contextValue}>
      {children}
    </UIStateContext.Provider>
  );
};
