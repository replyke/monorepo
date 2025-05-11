import React, { createContext, useState, useRef } from "react";
import { Comment as CommentType } from "@replyke/core";
import BottomSheet from "@gorhom/bottom-sheet";
import { BottomSheetMethods } from "@gorhom/bottom-sheet/lib/typescript/types";

type SheetManagerContext = {
  commentOptionsSheetRef: React.RefObject<BottomSheetMethods | null>;
  reportCommentSheetRef: React.RefObject<BottomSheetMethods | null>;

  openCommentOptionsSheet: (newComment?: CommentType) => void;
  closeCommentOptionsSheet: () => void;
  openReportCommentSheet: () => void;
  closeReportCommentSheet: () => void;

  optionsComment: CommentType | null;
  setOptionsComment: React.Dispatch<React.SetStateAction<CommentType | null>>;

  reportedComment: CommentType | null;
  setReportedComment: React.Dispatch<React.SetStateAction<CommentType | null>>;
};

export const SheetManagerContext = createContext<Partial<SheetManagerContext>>(
  {}
);

export const SheetManagerProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const commentOptionsSheetRef = useRef<BottomSheet>(null);
  const reportCommentSheetRef = useRef<BottomSheet>(null);

  const [optionsComment, setOptionsComment] = useState<CommentType | null>(
    null
  );
  const [reportedComment, setReportedComment] = useState<CommentType | null>(
    null
  );

  const openCommentOptionsSheet = (newComment?: CommentType) => {
    if (newComment) setOptionsComment(newComment);
    commentOptionsSheetRef.current?.snapToIndex(0);
  };

  const closeCommentOptionsSheet = () => {
    commentOptionsSheetRef.current?.close();
  };

  const openReportCommentSheet = (newComment?: CommentType) => {
    if (newComment) setOptionsComment(newComment);
    reportCommentSheetRef.current?.snapToIndex(0);
  };

  const closeReportCommentSheet = () => {
    reportCommentSheetRef.current?.close();
  };

  return (
    <SheetManagerContext.Provider
      value={{
        commentOptionsSheetRef,
        reportCommentSheetRef,

        openCommentOptionsSheet,
        closeCommentOptionsSheet,
        openReportCommentSheet,
        closeReportCommentSheet,

        optionsComment,
        setOptionsComment,
        reportedComment,
        setReportedComment,
      }}
    >
      {children}
    </SheetManagerContext.Provider>
  );
};
