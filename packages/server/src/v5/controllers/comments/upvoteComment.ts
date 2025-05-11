import { Request as ExReq, Response as ExRes } from "express";

import { Comment, Entity, User } from "../../../models";
import IComment from "../../../interfaces/IComment";
import { commentParams } from "../../../constants/sequelize-query-params";
import createNotification from "../../../helpers/createNotification";
import IUser from "../../../interfaces/IUser";
import updateUserReputation from "../../../helpers/updateUserReputation";
import reputationScores from "../../../constants/reputation-scores";
import IEntity from "../../../interfaces/IEntity";
import { getCoreConfig } from "../../../config";

export default async (req: ExReq, res: ExRes) => {
  try {
    const { commentId } = req.params;
    const loggedInUserId = req.userId;
    const projectId = req.project.id!;

    const { sequelize } = getCoreConfig();

    // Validate the presence of required fields.
    if (!commentId) {
      res.status(400).json({
        error: "Missing required data",
        code: "comment/missing-data",
      });
      return;
    }

    // Retrieve the comment to be upvoted.
    const comment = (await Comment.findOne({
      where: { id: commentId, projectId },
      ...commentParams,
    })) as IComment | null;

    if (!comment) {
      res.status(404).json({
        error: "Comment not found",
        code: "comment/not-found",
      });
      return;
    }

    // Check if the user has already upvoted the comment.
    if (comment.upvotes.includes(loggedInUserId)) {
      res.status(409).json({
        error: "User has already upvoted this comment",
        code: "comment/already-upvoted",
      });
      return;
    }

    const { comment: updatedComment } = await sequelize.transaction(
      async (transaction) => {
        // Update the comment's upvotes by adding the user's ID and removing it from downvotes if present.
        comment.set("upvotes", [...comment.upvotes, loggedInUserId]);
        comment.set(
          "downvotes",
          comment.downvotes.filter((downvote) => downvote !== loggedInUserId)
        );

        // Save the updated comment.
        await comment.save({ transaction });

        await updateUserReputation(
          comment.userId!,
          reputationScores.upvote,
          transaction
        );

        return { comment };
      }
    );

    // Return the updated comment.
    res.status(200).json(updatedComment.toJSON());

    // Fetch the user
    const user = (await User.findByPk(loggedInUserId)) as IUser | null;
    if (!user) {
      console.error("Logged in user object wasn't found");
      return;
    }

    // First, fetch the entity using Sequelize's findOne method.
    const entity = (await Entity.findOne({
      where: { projectId, id: comment.entityId },
    })) as IEntity | null;

    if (!entity) {
      console.error("Entity object wasn't found");
      return;
    }

    const entityJSON = entity.toJSON();

    createNotification(req, res, {
      userId: comment.userId!, // The recipient user ID, assumed here
      projectId,
      type: "comment-upvote",
      action: "open-comment",
      metadata: {
        entityId: entityJSON.id!,
        entityShortId: entityJSON.shortId!,
        entityTitle: entityJSON.title,
        entityContent: (entityJSON.content || "").slice(0, 200),

        commentId,
        commentContent: comment.content,

        initiatorId: user.id!,
        initiatorName: user.name,
        initiatorUsername: user.username,
        initiatorAvatar: user.avatar,
      },
    });
  } catch (err: any) {
    console.error("Error upvoting comment:", err);
    res.status(500).json({
      error: "Internal server error.",
      code: "comment/server-error",
      details: err.message,
    });
  }
};
