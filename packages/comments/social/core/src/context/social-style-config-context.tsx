"use client";

import React, { createContext, ReactNode } from "react";
import { SocialStyleConfig } from "../interfaces/style-props/SocialStyleConfig";

export interface SocialStyleConfigContextProps {
  styleConfig: SocialStyleConfig;
  children: ReactNode;
}

export interface SocialStyleConfigContextValues {
  styleConfig?: SocialStyleConfig;
}

export const SocialStyleConfigContext =
  createContext<SocialStyleConfigContextValues>({});

export const SocialStyleConfigProvider: React.FC<
  SocialStyleConfigContextProps
> = ({ styleConfig, children }: SocialStyleConfigContextProps) => {
  if (!styleConfig) throw new Error("Missing style config");

  return (
    <SocialStyleConfigContext.Provider value={{ styleConfig }}>
      {children}
    </SocialStyleConfigContext.Provider>
  );
};
