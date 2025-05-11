"use client";

import { useContext } from "react";
import {
  CommentSectionContext,
  CommentSectionContextValues,
} from "../../context/comment-section-context";

export default function useCommentSection(): Partial<CommentSectionContextValues> {
  return useContext(CommentSectionContext);
}
