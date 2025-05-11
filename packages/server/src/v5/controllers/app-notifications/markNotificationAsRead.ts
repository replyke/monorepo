import { Request as ExReq, Response as ExRes } from "express";
import { AppNotification } from "../../../models";

export default async (req: ExReq, res: ExRes) => {
  try {
    const loggedInUserId = req.userId;
    const projectId = req.project.id;

    const { notificationId } = req.params;

    const updatedCount = await AppNotification.update(
      { isRead: true },
      {
        where: {
          id: notificationId,
          userId: loggedInUserId,
          projectId,
        },
      }
    );

    if (updatedCount[0] === 0) {
      res.status(404).json({
        error: "Notification not found",
        code: "app-notification/not-found",
      });
      return;
    }

    res.sendStatus(200);
  } catch (err: any) {
    console.error("Error marking notification as read: ", err);
    res.status(500).json({
      error: "Internal server error.",
      code: "app-notification/server-error",
      details: err.message,
    });
  }
};
