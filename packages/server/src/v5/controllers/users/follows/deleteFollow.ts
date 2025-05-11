import { Request as ExReq, Response as ExRes } from "express";
import { Follow } from "../../../../models";
import IFollow from "../../../../interfaces/IFollow";

export default async (req: ExReq, res: ExRes) => {
  try {
    const { userId: followedId } = req.params;
    const loggedInUserId = req.userId;
    const projectId = req.project.id;

    const follow = (await Follow.findOne({
      where: { followerId: loggedInUserId, followedId, projectId },
    })) as IFollow | null;

    if (!follow) {
      res.status(404).json({
        error: "Follow relationship does not exist.",
        code: "follow/not-found",
      });
      return;
    }

    await follow.destroy();

    res.sendStatus(204);
  } catch (err: any) {
    console.error("Error deleting follow:", err);
    res.status(500).json({
      error: "Internal server error.",
      code: "follow/server-error",
      details: err.message,
    });
  }
};
