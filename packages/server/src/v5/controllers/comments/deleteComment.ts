import { Request as ExReq, Response as ExRes } from "express";

import { Comment } from "../../../models";
import IComment from "../../../interfaces/IComment";
import updateUserReputation from "../../../helpers/updateUserReputation";
import reputationScores from "../../../constants/reputation-scores";
import { getCoreConfig } from "../../../config";

export default async (req: ExReq, res: ExRes) => {
  const { sequelize } = getCoreConfig();

  try {
    const { commentId } = req.params;
    const loggedInUserId = req.userId;
    const projectId = req.project.id;

    if (!commentId) {
      res.status(400).json({
        error: "Missing comment ID",
        code: "comment/missing-comment-id",
      });
      return;
    }
    // Delete the comment directly and ensure it's part of the project
    const comment = (await Comment.findOne({
      where: { id: commentId, projectId },
    })) as IComment | null;

    // Check if the comment was found and deleted
    if (!comment) {
      res.status(404).json({
        error: "Comment not found",
        code: "comment/not-found",
      });
      return;
    }

    if (comment.userId !== loggedInUserId && !req.isMaster) {
      res.status(403).json({
        error: "You do not have permission to delete this comment.",
        code: "comment/not-authorized",
      });
      return;
    }

    await sequelize.transaction(async (transaction) => {
      await comment.destroy({ transaction });

      await updateUserReputation(
        comment.userId!,
        -reputationScores.createComment,
        transaction
      );
      // Recursive function to update `parentDeletedAt` for all replies
      const updateReplies = async (
        parentCommentId: string,
        deletionDate: Date
      ) => {
        // Find all direct replies to the current comment
        const replies = (await Comment.findAll({
          where: { parentId: parentCommentId, projectId },
          transaction,
        })) as IComment[];

        // Update each reply's `parentDeletedAt` and call recursively for its replies
        for (const reply of replies) {
          await reply.update(
            { parentDeletedAt: deletionDate },
            { transaction }
          );
          // Recursive call for nested replies
          await updateReplies(reply.id!, deletionDate);
        }
      };

      // Set the deletion date
      const deletionDate = new Date();
      // Start the recursive update process for replies
      await updateReplies(commentId, deletionDate);
    });

    res.sendStatus(204);
  } catch (err: any) {
    console.error("Error deleting comment:", err);
    res.status(500).json({
      error: "Server error",
      code: "comment/server-error",
      details: err.message,
    });
  }
};
