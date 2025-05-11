"use client";

import React, { createContext } from "react";
import useEntityListData, {
  UseEntityListDataProps,
  UseEntityListDataValues,
} from "../hooks/entities/useEntityListData";

export interface EntityListContextProps extends UseEntityListDataProps {
  children: React.ReactNode;
}
export interface EntityListContextValues extends UseEntityListDataValues {}

export const EntityListContext = createContext<
  Partial<EntityListContextValues>
>({});

export const EntityListProvider: React.FC<EntityListContextProps> = ({
  children,
  ...restOfProps
}: EntityListContextProps) => {
  const data = useEntityListData(restOfProps);

  return (
    <EntityListContext.Provider value={data}>
      {children}
    </EntityListContext.Provider>
  );
};
