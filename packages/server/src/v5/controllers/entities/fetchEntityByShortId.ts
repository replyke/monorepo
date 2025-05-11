import { Request as ExReq, Response as ExRes } from "express";

import scoreEntity from "../../../helpers/scoreEntity";
import { Entity } from "../../../models";
import IEntity, { IEntityAttributes } from "../../../interfaces/IEntity";
import { entityParams } from "../../../constants/sequelize-query-params";

export default async (req: ExReq, res: ExRes) => {
  try {
    const { shortId } = req.query;
    const projectId = req.project.id!;

    // Validate the presence of projectId and either foreignId or entityId.
    if (shortId && typeof shortId !== "string") {
      res.status(400).json({
        error: "Missing shortId in request query.",
        code: "entity/invalid-query-params",
      });
      return;
    }

    let entity: IEntity | null = (await Entity.findOne({
      where: { projectId, shortId },
      ...entityParams,
    })) as IEntity | null;

    if (!entity) {
      res.status(404).json({
        error: "Entity not found",
        code: "entity/not-found",
      });
      return;
    }
    // Convert entity to plain JSON for scoring.
    const entityData: IEntityAttributes & { repliesCount: number } =
      entity.toJSON();

    // Return the entity with a 200 (OK) status.
    res.status(200).json(entityData);

    // Schedule the score update asynchronously.
    setImmediate(async () => {
      try {
        const { newScore, newScoreUpdatedAt, updated } =
          scoreEntity(entityData);

        if (updated) {
          entity!.score = newScore;
          entity!.scoreUpdatedAt = newScoreUpdatedAt;
          await entity!.save();
        }
      } catch (updateErr) {
        console.error(
          "Error updating entity score asynchronously: ",
          updateErr
        );
      }
    });
  } catch (err: any) {
    console.error("Error fetching an entity:", err);
    res.status(500).json({
      error: "Internal server error.",
      code: "entity/server-error",
      details: err.message,
    });
  }
};
