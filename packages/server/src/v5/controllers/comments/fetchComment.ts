import { Request as ExReq, Response as ExRes } from "express";

import { commentParams } from "../../../constants/sequelize-query-params";
import IComment from "../../../interfaces/IComment";
import { Comment } from "../../../models";

export default async (req: ExReq, res: ExRes) => {
  try {
    const { withParent } = req.query;
    const { commentId } = req.params;
    const projectId = req.project.id;

    if (!commentId || typeof commentId !== "string") {
      res.status(400).json({
        error: "Missing a valid comment ID in request query",
        code: "comment/invalid-request",
      });
      return;
    }

    const comment = (await Comment.findOne({
      where: { projectId, id: commentId },
      ...commentParams,
    })) as IComment | null;

    if (!comment) {
      res.status(404).json({
        error: "Comment not found",
        code: "comment/not-found",
      });
      return;
    }

    if (!withParent || !comment.parentId) {
      res.status(200).json({
        comment: comment.toJSON(),
        parentComment: null,
      });
      return;
    }

    let parentComment = (await Comment.findOne({
      where: { projectId, id: comment.parentId },
      ...commentParams,
    })) as IComment | null;

    // Return the comment and it's parent with a 200 (OK) status.
    res.status(200).json({
      comment: comment.toJSON(),
      parentComment: parentComment?.toJSON(),
    });
  } catch (err: any) {
    console.error("Error fetching a comment: ", err);
    res.status(500).json({
      error: "Internal server error.",
      code: "comment/server-error",
      details: err.message,
    });
  }
};
