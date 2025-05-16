import { Request as ExReq, Response as ExRes } from "express";
import { Entity, Comment, User } from "../../../models";
import IEntity from "../../../interfaces/IEntity";
import IComment from "../../../interfaces/IComment";
import { commentParams } from "../../../constants/sequelize-query-params";
import createNotification from "../../../helpers/createNotification";
import IUser from "../../../interfaces/IUser";
import updateUserReputation from "../../../helpers/updateUserReputation";
import reputationScores from "../../../constants/reputation-scores";
import { getCoreConfig } from "../../../config";

export default async (req: ExReq, res: ExRes) => {
  try {
    const { sequelize } = getCoreConfig();

    const {
      userId: userIdProp, // Not passed from React libraries hook, but could be passed from server using the js sdk
      entityId,
      foreignId,
      content,
      gif,
      mentions,
      parentId,
      referencedCommentId,
      attachments,
      metadata,
    } = req.body;
    const loggedInUserId = req.userId;
    const projectId = req.project.id!;

    // Validate the presence of required fields.
    if (!entityId) {
      res.status(400).json({
        error: "Missing entity ID",
        code: "comment/missing-entity-id",
      });
      return;
    }
    if (!content && !gif) {
      res.status(400).json({
        error: "Missing required comment content",
        code: "comment/missing-content",
      });
      return;
    }

    // Update the entity's comment or reply count
    const entity = (await Entity.findOne({
      where: { projectId, id: entityId },
    })) as IEntity | null;

    if (!entity) {
      res
        .status(404)
        .json({ error: "Entity not found", code: "comment/entity-not-found" });
      return;
    }

    let userId: string | null = null;
    if (req.isMaster && userIdProp) {
      userId = userIdProp;
    } else if (loggedInUserId) {
      userId = loggedInUserId;
    }

    if (!userId) {
      res.status(400).json({
        error: "Missing user ID",
        code: "comment/missing-user-id",
      });
      return;
    }

    const { comment } = await sequelize.transaction(async (transaction) => {
      // Create the comment using Sequelize's create method
      const comment = (await Comment.create(
        {
          projectId,
          foreignId,
          referenceId: foreignId,
          userId,
          entityId,
          parentId,
          content,
          gif,
          mentions,
          referencedCommentId,
          attachments,
          metadata,
        },
        { transaction }
      )) as IComment;

      await updateUserReputation(
        userId!,
        reputationScores.createComment,
        transaction
      );

      return { comment };
    });

    // Fetch the comment again with the associated user
    const populatedComment = (await Comment.findOne({
      where: { id: comment.id },
      ...commentParams,
    })) as IComment;

    const { handlers } = getCoreConfig();
    await handlers.createComment({ projectId });

    // Return the newly created comment or reply
    res.status(201).json(populatedComment.toJSON());

    // Fetch the user
    const user = (await User.findByPk(userId)) as IUser | null;
    if (!user) {
      console.error(
        "Logged in user object wasn't found after comment creation."
      );
      return;
    }

    if (comment.parentId) {
      const parentComment = (await Comment.findOne({
        where: { id: comment.parentId },
      })) as IComment;

      if (parentComment && parentComment.userId) {
        createNotification(req, res, {
          userId: parentComment.userId!, // The recipient user ID, assumed here
          projectId,
          type: "comment-reply",
          action: "open-comment",
          metadata: {
            entityId: entity.id!,
            entityShortId: entity.shortId!,
            entityTitle: entity.title,
            entityContent: (entity.content || "").slice(0, 200),

            commentId: comment.id!, // This should stay and not the parent ID because we want this to be highlighted
            commentContent: comment.content,

            replyId: comment.parentId,
            replyContent: "",

            initiatorId: user.id!,
            initiatorName: user.name,
            initiatorUsername: user.username,
            initiatorAvatar: user.avatar,
          },
        });
      }
    } else if (entity.userId) {
      createNotification(req, res, {
        userId: entity.userId, // The recipient user ID, assumed here
        projectId,
        type: "entity-comment",
        action: "open-comment",
        metadata: {
          entityId: entity.id!,
          entityShortId: entity.shortId!,
          entityTitle: entity.title,
          entityContent: (entity.content || "").slice(0, 200),

          commentId: comment.id!,
          commentContent: comment.content,

          initiatorId: user.id!,
          initiatorName: user.name,
          initiatorUsername: user.username,
          initiatorAvatar: user.avatar,
        },
      });
    }

    comment.mentions.forEach((mention) => {
      // We check if the mention ID dons't equal the userId of the author of the entity as the author of the entity wil get a notification fo this comment regardless of th mention, and we don't want to send two

      if (mention.id && mention.id !== entity.userId) {
        createNotification(req, res, {
          userId: mention.id, // The recipient user ID, assumed here
          projectId,
          type: "comment-mention",
          action: "open-comment",
          metadata: {
            entityId: entity.id!,
            entityShortId: entity.shortId!,
            entityTitle: entity.title,
            entityContent: (entity.content || "").slice(0, 200),

            commentId: comment.id!,
            commentContent: comment.content,

            initiatorId: loggedInUserId,
            initiatorName: user.name,
            initiatorUsername: user.username,
            initiatorAvatar: user.avatar,
          },
        });
      }
    });
  } catch (err: any) {
    console.error("Error posting a comment: ", err);
    res.status(500).json({
      error: "Internal server error",
      code: "comment/server-error",
      details: err.message,
    });
  }
};
