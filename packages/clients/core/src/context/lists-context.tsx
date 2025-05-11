"use client";

import React, { createContext } from "react";
import useListsData, {
  UseListsDataProps,
  UseListsDataValues,
} from "../hooks/lists/useListsData";

export interface ListsContextProps extends UseListsDataProps {
  children: React.ReactNode;
}
export interface ListsContextValues extends UseListsDataValues {}

export const ListsContext = createContext<Partial<ListsContextValues>>({});

export const ListsProvider: React.FC<ListsContextProps> = ({
  children,
}: ListsContextProps) => {
  const data = useListsData({});

  return <ListsContext.Provider value={data}>{children}</ListsContext.Provider>;
};
