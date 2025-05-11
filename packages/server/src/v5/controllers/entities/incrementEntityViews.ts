import { Request as ExReq, Response as ExRes } from "express";

import { Entity } from "../../../models";
import IEntity from "../../../interfaces/IEntity";

export default async (req: ExReq, res: ExRes) => {
  const { entityId } = req.params;
  const projectId = req.project.id;

  if (!entityId) {
    res.status(400).json({
      error: "Invalid entity ID.",
      code: "entity/invalid-id",
    });
    return;
  }

  try {
    // Increment the views count directly and handle the deeply nested result structure
    const [[affectedRows, affectedCount]] = (await Entity.increment(
      { views: 1 },
      { where: { projectId, id: entityId } }
    )) as unknown as [[IEntity[], number]]; // Type assertion for nested structure

    // Check if the entity was found and incremented
    if (affectedCount === 0 || affectedRows.length === 0) {
      res.status(404).json({
        error: "Entity not found.",
        code: "entity/not-found",
      });
      return;
    }

    // Retrieve the first updated instance
    const updatedEntity = affectedRows[0];

    // Return the updated entity in JSON format
    res.status(200).json(updatedEntity.toJSON());
  } catch (err: any) {
    console.error("Failed to increment entity views:", err);
    res.status(500).json({
      error: "An error occurred while updating entity views.",
      code: "entity/server-error",
      details: err.message,
    });
  }
};
