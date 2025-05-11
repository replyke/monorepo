"use client";

import React, { createContext } from "react";
import useProjectData, {
  UseProjectDataProps,
  UseProjectDataValues,
} from "../hooks/projects/useProjectData";
import { AuthProvider } from "./auth-context";

export interface ReplykeContextProps extends UseProjectDataProps {
  signedToken?: string | null | undefined;
  children: React.ReactNode;
}

export interface ReplykeContextValues extends UseProjectDataValues {}

export const ReplykeContext = createContext<ReplykeContextValues>({
  projectId: "",
  project: null,
});

export const ReplykeProvider: React.FC<ReplykeContextProps> = ({
  projectId,
  signedToken,
  children,
}: ReplykeContextProps) => {
  const data = useProjectData({ projectId });

  if (!projectId)
    throw new Error("projectId in ReplykeProvider is " + typeof projectId);

  return (
    <ReplykeContext.Provider value={data}>
      <AuthProvider signedToken={signedToken}>{children}</AuthProvider>
    </ReplykeContext.Provider>
  );
};
