import { Request as ExReq, Response as ExRes } from "express";
import { sendWebhookRequestWithHandle } from "./utility-functions";
import IUser from "../../interfaces/IUser";

export default async (
  req: ExReq,
  res: ExRes,
  payload: {
    projectId: string;
    data: Partial<IUser>;
  }
) => {
  const userUpdatedWebhook = req.project.webhooks.userUpdated;
  if (!userUpdatedWebhook) return;

  const sharedSecret = req.project.keys.secret?.key;

  if (!sharedSecret) {
    return res
      .status(400)
      .json({ error: "Webhook URL or secret not configured" });
  }

  try {
    const webhookResponse = await sendWebhookRequestWithHandle(
      userUpdatedWebhook,
      payload,
      sharedSecret
    );

    if (!webhookResponse || webhookResponse.valid !== true) {
      return res.status(400).json({
        error: webhookResponse?.message || "Invalid user data",
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
