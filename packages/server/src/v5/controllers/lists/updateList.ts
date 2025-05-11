import { Request as ExReq, Response as ExRes } from "express";
import { Op } from "sequelize";
import { List } from "../../../models";
import populateList from "../../../helpers/populateList";
import IList from "../../../interfaces/IList";

// Main handler function
export default async (req: ExReq, res: ExRes) => {
  try {
    const { update } = req.body;
    const { listId } = req.params;

    const loggedInUserId = req.userId;
    const projectId = req.project.id;

    // Validate the presence of required fields.
    if (!listId || !update) {
      res.status(400).json({
        error: "Missing list ID or update data",
        code: "list/missing-data",
      });
      return;
    }
    const { name } = update;

    // Validate the presence of required fields.
    if (!name) {
      res.status(400).json({
        error: "Cannot set the name to blank",
        code: "list/blank-name",
      });
      return;
    }

    // Update the name in a single operation and retrieve the updated row
    const [rowsUpdated, [updatedList]] = await List.update(
      { name },
      {
        where: {
          projectId,
          userId: loggedInUserId,
          id: listId,
          parentId: { [Op.ne]: null }, // Ensure parentId is not null
        },
        returning: true, // Fetch the updated record in one step
      }
    );

    // Handle cases where the list is not found.
    if (rowsUpdated === 0 || !updatedList) {
      res.status(404).json({ error: "List not found", code: "list/not-found" });
      return;
    }

    const populatedList = await populateList(updatedList as IList);

    res.status(200).json(populatedList);
  } catch (err: any) {
    console.error("Error updating list: ", err);
    res.status(500).json({
      error: "Server error",
      code: "list/server-error",
      details: err.message,
    });
  }
};
