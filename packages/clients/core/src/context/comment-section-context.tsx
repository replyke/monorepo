"use client";

import React, { createContext, ReactNode } from "react";

import useCommentSectionData, {
  UseCommentSectionDataProps,
  UseCommentSectionDataValues,
} from "../hooks/comments/useCommentSectionData";

export interface CommentSectionProviderProps
  extends UseCommentSectionDataProps {
  children: ReactNode;
}
export interface CommentSectionContextValues
  extends UseCommentSectionDataValues {}

export const CommentSectionContext = createContext<
  Partial<CommentSectionContextValues>
>({});

export const CommentSectionProvider: React.FC<CommentSectionProviderProps> = ({
  children,
  ...restOfProps
}: CommentSectionProviderProps) => {
  const data = useCommentSectionData(restOfProps);

  return (
    <CommentSectionContext.Provider value={data}>
      {children}
    </CommentSectionContext.Provider>
  );
};
