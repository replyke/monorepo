import { Request as ExReq, Response as ExRes } from "express";
import { AppNotification } from "../../../models";

export default async (req: ExReq, res: ExRes) => {
  try {
    const { page = 1, limit = 5 } = req.query;

    const loggedInUserId = req.userId;
    const projectId = req.project.id;

    // Convert 'limit' and 'page' to numbers and validate them.
    let limitAsNumber = Number(limit);
    if (isNaN(limitAsNumber)) {
      res.status(400).json({
        error: "Invalid request: limit must be a number",
        code: "app-notification/invalid-limit",
      });
      return;
    }
    limitAsNumber = Math.min(limitAsNumber, 50);

    const pageAsNumber = Number(page);
    if (isNaN(pageAsNumber) || pageAsNumber < 1 || pageAsNumber % 1 !== 0) {
      res.status(400).json({
        error: "Invalid request: 'page' must be a whole number greater than 0",
        code: "app-notification/invalid-page",
      });
      return;
    }

    // Perform the query on the Entity model with pagination, sorting, and filtering
    const appNotifications = await AppNotification.findAll({
      where: {
        projectId,
        userId: loggedInUserId,
      },
      order: [["createdAt", "DESC"]],
      limit: limitAsNumber,
      offset: (pageAsNumber - 1) * limitAsNumber, // Skip count for pagination
    });

    res.status(200).json(appNotifications.map((i) => i.toJSON()));
  } catch (err: any) {
    console.error("Error fetching app notifications:", err);
    res.status(500).json({
      error: "Internal server error.",
      code: "app-notification/server-error",
      details: err.message,
    });
  }
};
