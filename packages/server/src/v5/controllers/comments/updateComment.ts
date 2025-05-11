import { Request as ExReq, Response as ExRes } from "express";

import { Comment } from "../../../models";
import IComment from "../../../interfaces/IComment";

export default async (req: ExReq, res: ExRes) => {
  try {
    const { content } = req.body;
    const { commentId } = req.params;

    const loggedInUserId = req.userId;
    const projectId = req.project.id;

    // Validate the presence of required data.
    if (!commentId || !content) {
      res.status(400).json({
        error: "Missing required data",
        code: "comment/invalid-request",
      });
      return;
    }

    // Find the comment by projectId and commentId
    const comment = (await Comment.findOne({
      where: {
        id: commentId,
        projectId,
      },
    })) as IComment | null;

    // If no comment is found, return a 404 (Not Found) status.
    if (!comment) {
      res.status(404).json({
        error: "Comment not found",
        code: "comment/not-found",
      });
      return;
    }

    if (comment.userId !== loggedInUserId && !req.isMaster) {
      res.status(403).json({
        error: "You do not have permission to update this comment.",
        code: "comment/forbidden",
      });
      return;
    }

    // Update the comment with the provided update content.
    await comment.update({ content });

    // Reload the comment to ensure the latest data is fetched.
    await comment.reload();

    // Return the updated comment.
    res.status(200).json(comment.toJSON());
  } catch (err: any) {
    console.error("Error updating comment: ", err);
    res.status(500).json({
      error: "Internal server error.",
      code: "comment/server-error",
      details: err.message,
    });
  }
};
