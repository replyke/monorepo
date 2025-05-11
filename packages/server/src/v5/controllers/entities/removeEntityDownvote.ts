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

    // Validate the presence of entityId and userId.
    if (!entityId) {
      res.status(400).json({
        error: "Invalid entity ID.",
        code: "entity/invalid-id",
      });
      return;
    }

    // Fetch the entity with a row lock for safe update (if transaction is used).
    const entity = (await Entity.findOne({
      where: { projectId, id: entityId },
    })) as IEntity | null;

    if (!entity) {
      res.status(404).json({
        error: "Entity not found.",
        code: "entity/not-found",
      });
      return;
    }

    // If the entity does not exist or the user hasn't liked it.
    if (!entity.downvotes.includes(loggedInUserId)) {
      res.status(409).json({
        error:
          "Can't remove downvote, as user didn't downvote entity or entity not found.",
        code: "entity/not-downvoted",
      });
      return;
    }

    await sequelize.transaction(async (transaction) => {
      // Update the entity by removing the user's ID from upvotes and decrementing upvotesCount.
      entity.set(
        "downvotes",
        entity.downvotes.filter((downvote) => downvote !== loggedInUserId)
      );
      //  entity.set("downvotesCount", Math.max(entity.upvotesCount - 1, 0));

      // Save the updated entity within the transaction.
      await entity.save({ transaction });

      if (entity.userId) {
        await updateUserReputation(
          entity.userId,
          reputationScores.upvote,
          transaction
        );
      }
    });

    // Fetch the entity again but populated now
    const populatedEntity = (await Entity.findOne({
      where: { id: entity.id },
      ...entityParams,
    })) as IEntity;

    // Return the updated entity.
    res.status(200).json(populatedEntity.toJSON());
  } catch (err: any) {
    console.error("Error removing downvote from entity:", err);
    res.status(500).json({
      error: "Internal server error.",
      code: "entity/server-error",
      details: err.message,
    });
  }
};
