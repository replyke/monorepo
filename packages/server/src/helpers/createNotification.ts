import { Request as ExReq, Response as ExRes } from "express";

import validateNotificationParams from "./validateNotificationParams";
import { NotificationParams } from "../interfaces/IAppNotification";
import { AppNotification } from "../models";
import broadcastNotificationCreated from "./webhooks/broadcastNotificationCreated";

export default async function createNotification(
  req: ExReq,
  res: ExRes,
  params: NotificationParams
): Promise<void> {
  setImmediate(async () => {
    if (!validateNotificationParams(params)) {
      console.error(`Invalid notification data for type: ${params.type}`);
      return;
    }

    // In production this should be active.
    if (params.userId === params.metadata.initiatorId) return;

    try {
      await AppNotification.create(params);

      await broadcastNotificationCreated(req, res, params);
    } catch (error) {
      console.error("Error creating notification:", error);
    }
  });
}
