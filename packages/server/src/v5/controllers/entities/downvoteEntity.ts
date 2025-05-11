import { Request as ExReq, Response as ExRes } from "express";

import { Entity } from "../../../models";
import IEntity from "../../../interfaces/IEntity";
import { entityParams } from "../../../constants/sequelize-query-params";
import updateUserReputation from "../../../helpers/updateUserReputation";
import reputationScores from "../../../constants/reputation-scores";
import { getCoreConfig } from "../../../config";

export default async (req: ExReq, res: ExRes) => {
  try {
    const { entityId } = req.params;
    const loggedInUserId = req.userId;
    const projectId = req.project.id;
    const { sequelize } = getCoreConfig();

    if (!entityId) {
      res.status(400).json({
        error: "Invalid entityId.",
        code: "entity/invalid-id",
      });
      return;
    }

    // First, fetch the entity using Sequelize's findOne method.
    let entity = (await Entity.findOne({
      where: { projectId, id: entityId },
    })) as IEntity | null;

    if (!entity) {
      res.status(404).json({
        error: "Entity not found.",
        code: "entity/not-found",
      });
      return;
    }

    if (entity.downvotes.includes(loggedInUserId)) {
      res.status(409).json({
        error: "User already downvoted entity.",
        code: "entity/already-downvoted",
      });
      return;
    }

    await sequelize.transaction(async (transaction) => {
      // Atomically increment upvotesCount and update upvotes array in the database
      // await entity.increment("upvotesCount", { by: 1, transaction });
      entity!.set("downvotes", [...entity!.downvotes, loggedInUserId]); // Add userId to downvotes
      entity!.set(
        "upvotes",
        entity!.upvotes.filter((upvote) => upvote !== loggedInUserId)
      ); // Make sure userId is removed from upvotes in case they were there

      await entity!.save({ transaction });

      if (entity!.userId) {
        await updateUserReputation(
          entity!.userId,
          -reputationScores.upvote,
          transaction
        );
      }
    });

    // Fetch the entity again but populated now
    const populatedEntity = (await Entity.findOne({
      where: { id: entity.id },
      ...entityParams,
    })) as IEntity;

    // Return the updated or newly created entity.
    res.status(200).json(populatedEntity.toJSON());
  } catch (err: any) {
    console.error("Error downvoting an entity:", err);
    res.status(500).json({
      error: "Internal server error.",
      code: "entity/server-error",
      details: err.message,
    });
  }
};
