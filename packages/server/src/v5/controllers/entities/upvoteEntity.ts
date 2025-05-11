import { Request as ExReq, Response as ExRes } from "express";

import { Entity } from "../../../models";
import IEntity from "../../../interfaces/IEntity";
import { entityParams } from "../../../constants/sequelize-query-params";
import createNotification from "../../../helpers/createNotification";
import { User } from "../../../models";
import IUser from "../../../interfaces/IUser";
import updateUserReputation from "../../../helpers/updateUserReputation";
import reputationScores from "../../../constants/reputation-scores";
import { getCoreConfig } from "../../../config";

export default async (req: ExReq, res: ExRes) => {
  try {
    const { entityId } = req.params;
    const loggedInUserId = req.userId;
    const projectId = req.project.id!;
    const { sequelize } = getCoreConfig();

    // Validate the presence of entityId
    if (!entityId) {
      res.status(400).json({
        error: "Missing entityId in request.",
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

    // Check if user already liked the entity
    if (entity.upvotes.includes(loggedInUserId)) {
      res.status(409).json({
        error: "User already upvoted entity.",
        code: "entity/already-upvoted",
      });
      return;
    }

    await sequelize.transaction(async (transaction) => {
      // Atomically increment upvotesCount and update upvotes array in the database
      // await entity.increment("upvotesCount", { by: 1, transaction });
      entity!.set("upvotes", [...entity!.upvotes, loggedInUserId]); // Add userId to upvotes
      entity!.set(
        "downvotes",
        entity!.downvotes.filter((downvote) => downvote !== loggedInUserId)
      ); // Make sure userId is removed from downvotes in case they were there

      await entity!.save({ transaction });

      if (entity!.userId) {
        await updateUserReputation(
          entity!.userId,
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

    // Return the updated or newly created entity.
    res.status(200).json(populatedEntity.toJSON());

    // Fetch the user to ensure it exists (optional but recommended)
    const user = (await User.findByPk(loggedInUserId)) as IUser | null;
    if (!user) {
      res.status(404).send("Logged in user object wasn't found");
      return;
    }

    if (entity.userId) {
      createNotification(req, res, {
        userId: entity.userId, // The recipient user ID, assumed here
        projectId,
        type: "entity-upvote",
        action: "open-entity",
        metadata: {
          entityId: entity.id!,
          entityShortId: entity.shortId!,
          entityTitle: entity.title,
          entityContent: (entity.content || "").slice(0, 200),

          initiatorId: loggedInUserId,
          initiatorName: user.name,
          initiatorUsername: user.username,
          initiatorAvatar: user.avatar,
        },
      });
    }
  } catch (err: any) {
    console.error("Error upvoting an entity:", err);
    res.status(500).json({
      error: "Internal server error.",
      code: "entity/server-error",
      details: err.message,
    });
  }
};
