import { Request as ExReq, Response as ExRes } from "express";
import { Op } from "sequelize";
import { List } from "../../../models";
import IList from "../../../interfaces/IList"; // Import the interface

export default async (req: ExReq, res: ExRes) => {
  try {
    // Extract projectId and userId from query parameters.
    const { entityId } = req.query;
    const loggedInUserId = req.userId;
    const projectId = req.project.id;

    if (!entityId || typeof entityId !== "string") {
      res.status(400).json({
        error: "Missing or invalid entityId in query",
        code: "list/invalid-entity-id",
      });
      return;
    }

    // Search for the list using Sequelize's findOne method.
    let list: IList | null = (await List.findOne({
      where: {
        projectId, // Ensure the types match
        userId: loggedInUserId,
        entityIds: { [Op.contains]: [entityId] },
      },
    })) as IList | null;

    // Return the list with a 200 (OK) status.
    res.status(200).json(!!list);
  } catch (err: any) {
    console.error("Error checking if entity is saved: ", err);
    res.status(500).json({
      error: "Internal server error.",
      code: "list/server-error",
      details: err.message,
    });
  }
};
