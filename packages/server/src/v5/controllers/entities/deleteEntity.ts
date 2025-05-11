import { Request as ExReq, Response as ExRes } from "express";
import { Entity } from "../../../models";
import IEntity from "../../../interfaces/IEntity";
import updateUserReputation from "../../../helpers/updateUserReputation";
import reputationScores from "../../../constants/reputation-scores";
import { getCoreConfig } from "../../../config";

export default async (req: ExReq, res: ExRes) => {
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

  try {
    // Fetch the entity to get the author (userId)
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

    // Determine if current user is admin or the author
    const isAuthor = entity.userId === loggedInUserId;

    // If the user is not admin and not author, they cannot delete
    if (!isAuthor && !req.isMaster) {
      res.status(403).json({
        error: "Not authorized to delete this entity.",
        code: "entity/not-authorized",
      });
      return;
    }

    const deletedCount = await sequelize.transaction(async (t) => {
      // a) perform the delete
      const count = await Entity.destroy({
        where: { projectId, id: entityId },
        transaction: t,
      });

      // b) only if something was deleted do we remove reputation
      if (count > 0 && entity.userId) {
        await updateUserReputation(
          entity.userId,
          -reputationScores.createEntity,
          t
        );
      }

      return count;
    });

    // 3. Now check the result
    if (deletedCount === 0) {
      // no rows were deleted → nothing to undo
      res.status(404).json({
        error: "Entity not found or already deleted.",
        code: "entity/delete-failed",
      });
      return;
    }

    res.sendStatus(204);
  } catch (err: any) {
    console.error("Failed to delete the entity:", err);
    res.status(500).json({
      error: "Failed to delete the entity.",
      code: "entity/server-error",
      details: err.message,
    });
  }
};
