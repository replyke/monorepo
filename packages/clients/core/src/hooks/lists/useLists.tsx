"use client";

import { useContext } from "react";
import { ListsContext, ListsContextValues } from "../../context/lists-context";

export default function useLists(): Partial<ListsContextValues> {
  return useContext(ListsContext);
}
