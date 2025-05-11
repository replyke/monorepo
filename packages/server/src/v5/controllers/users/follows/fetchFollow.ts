import { Request as ExReq, Response as ExRes } from "express";
import { Follow } from "../../../../models";

// Fetch a follow relationship
export default async (req: ExReq, res: ExRes) => {
  const { userId: followedId } = req.params;

  const loggedInUserId = req.userId;
  const projectId = req.project.id;

  try {
    // Check if the follow relationship exists
    const followExists = await Follow.findOne({
      where: { projectId, followerId: loggedInUserId, followedId },
    });

    res.status(200).json({ isFollowing: !!followExists });
  } catch (err: any) {
    console.error("Error fetching follow:", err);
    res.status(500).json({
      error: "Internal server error.",
      code: "follow/server-error",
      details: err.message,
    });
  }
};
