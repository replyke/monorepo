"use client";

import { createContext } from "react";
import useAppNotificationsData, {
  UseAppNotificationsDataValues,
  UseAppNotificationsDataProps,
} from "../hooks/app-notifications/useAppNotificationsData";

export interface AppNotificationsContextProps
  extends UseAppNotificationsDataProps {
  children: React.ReactNode;
}

export interface AppNotificationsContextValues
  extends UseAppNotificationsDataValues {}

export const AppNotificationsContext = createContext<
  Partial<AppNotificationsContextValues>
>({});

export const AppNotificationsProvider: React.FC<
  AppNotificationsContextProps
> = ({ children, ...restOfProps }: AppNotificationsContextProps) => {
  const data = useAppNotificationsData(restOfProps);
  return (
    <AppNotificationsContext.Provider value={data}>
      {children}
    </AppNotificationsContext.Provider>
  );
};
