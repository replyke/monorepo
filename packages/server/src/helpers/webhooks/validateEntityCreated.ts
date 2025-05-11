import { Request as ExReq, Response as ExRes } from "express";
import { sendWebhookRequestWithHandle } from "./utility-functions";
import IEntity from "../../interfaces/IEntity";

export default async (
  req: ExReq,
  res: ExRes,
  payload: {
    projectId: string;
    data: Partial<IEntity>;
    initiatorId: string | undefined;
  }
) => {
  const entityCreatedWebhook = req.project.webhooks.entityCreated;
  if (!entityCreatedWebhook) return;

  const sharedSecret = req.project.keys.secret?.key;

  if (!sharedSecret) {
    return res
      .status(400)
      .json({ error: "Webhook URL or secret not configured" });
  }

  try {
    const webhookResponse = await sendWebhookRequestWithHandle(
      entityCreatedWebhook,
      payload,
      sharedSecret
    );

    if (!webhookResponse || webhookResponse.valid !== true) {
      return res.status(400).json({
        error: webhookResponse?.message || "Invalid entity data",
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
