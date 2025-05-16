import { Request as ExReq, Response as ExRes } from "express";

import scoreEntity from "../../../helpers/scoreEntity";
import { Entity } from "../../../models";
import IEntity, { IEntityAttributes } from "../../../interfaces/IEntity";
import { entityParams } from "../../../constants/sequelize-query-params";
import validateEntityCreated from "../../../helpers/webhooks/validateEntityCreated";
import { getCoreConfig } from "../../../config";

export default async (req: ExReq, res: ExRes) => {
  try {
    const { foreignId, createIfNotFound } = req.query;
    const projectId = req.project.id!;

    // Validate the presence of projectId and either foreignId or entityId.
    if (foreignId && typeof foreignId !== "string") {
      res.status(400).json({
        error: "Missing valid foreignId in request query.",
        code: "entity/invalid-query-params",
      });
      return;
    }

    let entity: IEntity | null = (await Entity.findOne({
      where: { projectId, foreignId },
      ...entityParams,
    })) as IEntity | null;

    // If no entity is found, create a new blank one.
    if (!entity && createIfNotFound === "true") {
      // Call the webhook to validate the entity creation
      await validateEntityCreated(req, res, {
        projectId,
        data: { foreignId },
        initiatorId: undefined,
      });

      const newEntity = (await Entity.create({
        projectId,
        foreignId,
      })) as IEntity | null;

      entity = (await Entity.findOne({
        where: { projectId, id: newEntity?.id },
        ...entityParams,
      })) as IEntity | null;

      const { handlers } = getCoreConfig();
      await handlers.createEntity({ projectId });
    }

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
