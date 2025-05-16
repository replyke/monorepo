import { Request as ExReq, Response as ExRes } from "express";
import { ForeignKeyConstraintError } from "sequelize";
import ShortUniqueId from "short-uuid";
import { Entity } from "../../../models";
import { entityParams } from "../../../constants/sequelize-query-params";
import IEntity from "../../../interfaces/IEntity";
import createNotification from "../../../helpers/createNotification";
import { User } from "../../../models";
import IUser from "../../../interfaces/IUser";
import updateUserReputation from "../../../helpers/updateUserReputation";
import reputationScores from "../../../constants/reputation-scores";
import validateEntityCreated from "../../../helpers/webhooks/validateEntityCreated";
import ILocation from "../../../interfaces/ILocation";
import { getCoreConfig } from "../../../config";

export default async (req: ExReq, res: ExRes) => {
  const { sequelize, handlers } = getCoreConfig();

  try {
    const {
      userId: userIdProp, // Not passed from React libraries hook, but could be passed from server using the js sdk
      foreignId,
      sourceId,
      title,
      content,
      attachments,
      keywords,
      mentions,
      location,
      metadata,
      excludeUserId,
    } = req.body;

    const loggedInUserId = req.userId;
    const projectId = req.project.id!;

    // UserId doesn't have to be provided, as some entities can just be automatically created when a user visits. But if a userId is provided as the user that created the entity, then it must match the logged in user ID.
    if (
      userIdProp !== undefined &&
      userIdProp !== loggedInUserId &&
      !req.isMaster
    ) {
      res.status(403).json({
        error: "User is not authorized to create this entity.",
        code: "entity/unauthorized",
      });
      return;
    }

    const userId = excludeUserId ? undefined : userIdProp ?? loggedInUserId;

    const newEntityData: Partial<IEntity> & { projectId: string } = {
      projectId,
      referenceId: foreignId,
      foreignId: foreignId,
      sourceId,
      userId,
      title,
      content,
      attachments,
      keywords,
      mentions,
      location: location
        ? ({
            type: "Point",
            coordinates: [location.longitude, location.latitude],
          } as ILocation)
        : undefined,
      metadata,
    };

    const { projectId: _, ...restOfEntityData } = newEntityData;

    // Call the webhook to validate the entity creation
    await validateEntityCreated(req, res, {
      projectId,
      data: restOfEntityData,
      initiatorId: loggedInUserId,
    });

    const { entity } = await sequelize.transaction(async (transaction) => {
      // Create a new entity using Sequelize's create method
      const entity = (await Entity.create(
        {
          ...newEntityData,
          mentions,
        },
        { transaction }
      )) as IEntity;

      await entity.save({ transaction });

      if (userId) {
        await updateUserReputation(
          userId,
          reputationScores.createEntity,
          transaction
        );
      }

      return { entity };
    });

    await handlers.createEntity({ projectId });

    // Fetch the entity again but populated now
    const populatedEntity = (await Entity.findOne({
      where: { id: entity.id },
      ...entityParams,
    })) as IEntity;

    // Return the newly created entity with a 200 (OK) status
    res.status(200).json(populatedEntity.toJSON());

    // Trigger the notification in the background
    if (!entity.mentions) return;

    // Fetch the project to ensure it exists (optional but recommended)
    const user = (await User.findByPk(loggedInUserId)) as IUser | null;
    if (!user) return;

    entity.mentions.forEach((mention) => {
      if (mention.id !== entity.userId) {
        createNotification(req, res, {
          userId: entity.userId!,
          projectId,
          type: "entity-mention",
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
    });
  } catch (err: any) {
    if (err instanceof ForeignKeyConstraintError) {
      res.status(400).json({
        error: "Invalid projectId, project does not exist.",
        code: "report/invalid-foreign-key",
        details: err.message,
      });
      return;
    }
    console.error("Error creating an entity:", err);
    res.status(500).json({
      error: "Internal server error.",
      code: "entity/server-error",
      details: err.message,
    });
    return;
  }
};
