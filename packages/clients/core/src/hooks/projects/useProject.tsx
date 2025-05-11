"use client";

import { useContext } from "react";
import {
  ReplykeContext,
  ReplykeContextValues,
} from "../../context/replyke-context";

export default function useProject(): Partial<ReplykeContextValues> {
  return useContext(ReplykeContext);
}
