import { Request as ExReq, Response as ExRes } from "express";
import { AppNotification } from "../../../models";

export default async (req: ExReq, res: ExRes) => {
  try {
    const loggedInUserId = req.userId;
    const projectId = req.project.id;

    const count = await AppNotification.count({
      where: {
        projectId,
        userId: loggedInUserId,
        isRead: false,
      },
    });
    res.status(200).json(count);
  } catch (err: any) {
    console.error("Error counting unread app notifications:", err);
    res.status(500).json({
      error: "Internal server error.",
      code: "app-notification/server-error",
      details: err.message,
    });
  }
};
