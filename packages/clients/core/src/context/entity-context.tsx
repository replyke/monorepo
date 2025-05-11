"use client";

import React, { createContext } from "react";
import useEntityData, {
  UseEntityDataProps,
  UseEntityDataValues,
} from "../hooks/entities/useEntityData";

export interface EntityContextProps extends UseEntityDataProps {
  children: React.ReactNode;
}
export interface EntityContextValues extends UseEntityDataValues {}

export const EntityContext = createContext<Partial<EntityContextValues>>({});

export const EntityProvider: React.FC<EntityContextProps> = ({
  children,
  ...restOfProps
}: EntityContextProps) => {
  const data = useEntityData(restOfProps);

  if (
    !restOfProps.foreignId &&
    !restOfProps.entityId &&
    !restOfProps.shortId &&
    !restOfProps.entity?.id
  ) {
    // console.warn(
    //   "Please pass an entity ID, reference ID, short ID or a complete entity object to the EntityProvider"
    // );

    return null;
  }

  return (
    <EntityContext.Provider value={data}>{children}</EntityContext.Provider>
  );
};
