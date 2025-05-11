"use client";

import { useContext } from "react";
import {
  AppNotificationsContext,
  AppNotificationsContextValues,
} from "../../context/app-notifications-context";

export default function useAppNotifications(): Partial<AppNotificationsContextValues> {
  return useContext(AppNotificationsContext);
}
