import { Router } from "express";

import {
  createComment,
  fetchManyComments,
  fetchComment,
  fetchCommentByForeignId,
  updateComment,
  upvoteComment,
  removeCommentUpvote,
  downvoteComment,
  removeCommentDownvote,
  deleteComment,
} from "../controllers/comments";
import requireUserAuth from "../../middleware/requireUserAuth";

const router: Router = Router();

// Route for posting a new comment on an entity or reply to a comment.
router.post("/", requireUserAuth, createComment);

// Route to retrieve comments with pagination and sorting options.
router.get("/", fetchManyComments);

// Route to fetch a single comment by foreign id
router.get("/by-foreign-id", fetchCommentByForeignId);

// Route to fetch a single comment by id
router.get("/:commentId", fetchComment);

// Route for updating the content of a comment.
router.patch("/:commentId", requireUserAuth, updateComment);

// Route for upvoting a comment.
router.patch("/:commentId/upvote", requireUserAuth, upvoteComment);

// Route for removing a comment upvote.
router.patch("/:commentId/remove-upvote", requireUserAuth, removeCommentUpvote);

// Route for downvoting a comment.
router.patch("/:commentId/downvote", requireUserAuth, downvoteComment);

// Route for removing a comment downvote.
router.patch(
  "/:commentId/remove-downvote",
  requireUserAuth,
  removeCommentDownvote
);

// Route for deleting a comment and its replies.
router.delete("/:commentId", requireUserAuth, deleteComment);

export default router;
