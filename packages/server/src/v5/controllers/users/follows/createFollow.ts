import { Request as ExReq, Response as ExRes } from "express";
import { User } from "../../../../models";
import { Follow } from "../../../../models";
import createNotification from "../../../../helpers/createNotification";

// Create a follow relationship
export default async (req: ExReq, res: ExRes) => {
  const { userId: followedId } = req.params;
  const loggedInUserId = req.userId;
  const projectId = req.project.id!;

  try {
    // Ensure followerId and followedId are not the same
    if (loggedInUserId === followedId) {
      res.status(400).json({
        error: "A user cannot follow themselves.",
        code: "follow/self-follow",
      });
      return;
    }

    // Check if the follower and followed users exist
    const follower = await User.findByPk(loggedInUserId);
    const followed = await User.findByPk(followedId);

    if (!follower || !followed) {
      res.status(404).json({
        error: "One or both users involved in the follow do not exist.",
        code: "follow/user-not-found",
      });
      return;
    }

    // Check if the follow relationship already exists
    const existingFollow = await Follow.findOne({
      where: { projectId, followerId: loggedInUserId, followedId },
    });

    if (existingFollow) {
      res.status(409).json({
        error: "Follow relationship already exists.",
        code: "follow/already-exists",
      });
      return;
    }

    // Create the follow relationship
    await Follow.create({ projectId, followerId: loggedInUserId, followedId });

    res.sendStatus(201);

    const followerJSON = follower.toJSON();
    createNotification(req, res, {
      userId: followedId, // The recipient user ID, assumed here
      projectId,
      type: "new-follow",
      action: "open-profile",
      metadata: {
        initiatorId: followerJSON.id!,
        initiatorName: followerJSON.name,
        initiatorUsername: followerJSON.username,
        initiatorAvatar: followerJSON.avatar,
      },
    });
  } catch (err: any) {
    console.error("Error creating follow:", err);
    res.status(500).json({
      error: "Internal server error.",
      code: "follow/server-error",
      details: err.message,
    });
  }
};
