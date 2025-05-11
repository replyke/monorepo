"use client";

import { createContext } from "react";
import useUserData, {
  UseUserDataProps,
  UseUserDataValues,
} from "../hooks/users/useUserData";

export interface UserContextProps extends UseUserDataProps {
  children: React.ReactNode;
}

export interface UserContextValues extends UseUserDataValues {}

export const UserContext = createContext<Partial<UserContextValues>>({});

export const UserProvider: React.FC<UserContextProps> = ({
  children,
  ...restOfProps
}: UserContextProps) => {
  const data = useUserData(restOfProps);

  return <UserContext.Provider value={data}>{children}</UserContext.Provider>;
};
