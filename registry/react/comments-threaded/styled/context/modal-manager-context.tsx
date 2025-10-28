import React, { createContext, useState, useMemo, useCallback } from "react";
import { Comment as CommentType } from "@replyke/react-js";

type ModalManagerContext = {
  isCommentOptionsModalOpen: boolean;
  isCommentOptionsModalOwnerOpen: boolean;

  openCommentOptionsModal: (newComment?: CommentType) => void;
  closeCommentOptionsModal: () => void;
  openCommentOptionsModalOwner: (newComment?: CommentType) => void;
  closeCommentOptionsModalOwner: () => void;
  //   openReportCommentModal: () => void;
  //   closeReportCommentModal: () => void;

  optionsComment: CommentType | null;
  setOptionsComment: React.Dispatch<React.SetStateAction<CommentType | null>>;

  //   reportedComment: CommentType | null;
  //   setReportedComment: React.Dispatch<React.SetStateAction<CommentType | null>>;
};

export const ModalManagerContext = createContext<Partial<ModalManagerContext>>(
  {}
);

export const ModalManagerProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [isCommentOptionsModalOpen, setIsCommentOptionsModalOpen] =
    useState(false);
  const [isCommentOptionsModalOwnerOpen, setIsCommentOptionsModalOwnerOpen] =
    useState(false);

  const [optionsComment, setOptionsComment] = useState<CommentType | null>(
    null
  );

  //   const [reportedComment, setReportedComment] = useState<CommentType | null>(
  //     null
  //   );

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

  //   const openReportCommentModal = (newComment?: CommentType) => {
  //     if (newComment) setOptionsComment(newComment);
  //     reportCommentModalRef.current?.snapToIndex(0);
  //   };

  //   const closeReportCommentModal = () => {
  //     reportCommentModalRef.current?.close();
  //   };

  const contextValue = useMemo(() => ({
    isCommentOptionsModalOpen,
    isCommentOptionsModalOwnerOpen,

    openCommentOptionsModal,
    closeCommentOptionsModal,
    openCommentOptionsModalOwner,
    closeCommentOptionsModalOwner,
    // openReportCommentModal,
    // closeReportCommentModal,

    optionsComment,
    setOptionsComment,
    // reportedComment,
    // setReportedComment,
  }), [
    isCommentOptionsModalOpen,
    isCommentOptionsModalOwnerOpen,
    openCommentOptionsModal,
    closeCommentOptionsModal,
    openCommentOptionsModalOwner,
    closeCommentOptionsModalOwner,
    optionsComment,
  ]);

  return (
    <ModalManagerContext.Provider value={contextValue}>
      {children}
    </ModalManagerContext.Provider>
  );
};
