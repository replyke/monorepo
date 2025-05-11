import { Request as ExReq, Response as ExRes } from "express";
import { NotificationParams } from "../../interfaces/IAppNotification";
import { sendWebhookRequest } from "./utility-functions";

export default async (
  req: ExReq,
  _: ExRes,
  newNotificationData: NotificationParams
) => {
  const notificationCreatedWebhook = req.project.webhooks.notificationCreated;
  if (!notificationCreatedWebhook) return;

  const sharedSecret = req.project.keys.secret?.key;

  if (!sharedSecret) return;

  try {
    await sendWebhookRequest(
      notificationCreatedWebhook,
      newNotificationData,
      sharedSecret
    );
  } catch (err: any) {
    console.error(
      "Error sending notification webhook to project: " + req.project.id
    );
  }
};
