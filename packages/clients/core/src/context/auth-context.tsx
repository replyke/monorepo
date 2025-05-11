"use client";

import { createContext } from "react";
import useAuthData, {
  UseAuthDataProps,
  UseAuthDataValues,
} from "../hooks/auth/useAuthData";
import { UserProvider } from "./user-context";

export interface AuthContextProps extends UseAuthDataProps {
  children: React.ReactNode;
}

export interface AuthContextValues
  extends Omit<UseAuthDataValues, "user" | "setUser"> {}

export const AuthContext = createContext<Partial<AuthContextValues>>({});

export const AuthProvider: React.FC<AuthContextProps> = ({
  children,
  ...restOfProps
}: AuthContextProps) => {
  const { user, setUser, ...restOfValues } = useAuthData(restOfProps);

  return (
    <AuthContext.Provider value={restOfValues}>
      <UserProvider user={user} setUser={setUser}>
        {children}
      </UserProvider>
    </AuthContext.Provider>
  );
};
