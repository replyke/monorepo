import { Request as ExReq, Response as ExRes } from "express";

import { Comment } from "../../../models";
import IComment from "../../../interfaces/IComment";
import { commentParams } from "../../../constants/sequelize-query-params";
import updateUserReputation from "../../../helpers/updateUserReputation";
import reputationScores from "../../../constants/reputation-scores";
import { getCoreConfig } from "../../../config";

export default async (req: ExReq, res: ExRes) => {
  try {
    const { commentId } = req.params;
    const loggedInUserId = req.userId;
    const projectId = req.project.id;

    // Validate the presence of required fields.
    if (!commentId) {
      res.status(400).json({
        error: "Missing required data",
        code: "comment/missing-data",
      });
      return;
    }

    const { sequelize } = getCoreConfig();

    // Retrieve the comment to remove the upvote.
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
    // Check if the user has liked the comment.
    if (!comment.downvotes.includes(loggedInUserId)) {
      res.status(409).json({
        error: "User hasn't downvoted this comment",
        code: "comment/not-downvoted",
      });
      return;
    }

    const { comment: updatedComment } = await sequelize.transaction(
      async (transaction) => {
        // Update the comment to remove the user's downvote.
        comment.set(
          "downvotes",
          comment.downvotes.filter((id) => id !== loggedInUserId)
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
  } catch (err: any) {
    console.error("Error removing comment downvote:", err);
    res.status(500).json({
      error: "Internal server error.",
      code: "comment/server-error",
      details: err.message,
    });
  }
};
