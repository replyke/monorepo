import { Request as ExReq, Response as ExRes } from "express";
import { List } from "../../../models";
import populateList from "../../../helpers/populateList";
import IList from "../../../interfaces/IList";

export default async (req: ExReq, res: ExRes) => {
  try {
    const { listName } = req.body;
    const { listId } = req.params;
    const loggedInUserId = req.userId;
    const projectId = req.project.id;

    // Validate the presence of required fields.
    if (!listId || !listName) {
      res.status(400).json({
        error: "Missing required parameters in request body",
        code: "list/missing-parameters",
      });
      return;
    }

    const parentList = await List.findByPk(listId);
    if (!parentList) {
      res.status(400).json({
        error: "Invalid parent list ID for sub-list",
        code: "list/invalid-parent",
      });
      return;
    }

    // Create a new list (folder)
    const newList = await List.create(
      {
        projectId,
        userId: loggedInUserId,
        parentId: listId,
        name: listName,
      },
      {
        // Explicitly specify that `parentList` is the association for parentId
        include: [{ association: List.associations.parentList }],
      }
    );

    const populatedList = await populateList(newList as IList);

    // Return the created list with a 200 (OK) status.
    res.status(201).json(populatedList);
  } catch (err: any) {
    console.error("Error creating a list: ", err);
    res.status(500).json({
      error: "Server error",
      code: "list/server-error",
      details: err.message,
    });
  }
};
