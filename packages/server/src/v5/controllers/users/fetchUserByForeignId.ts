import { Request as ExReq, Response as ExRes } from "express";
import { User } from "../../../models";
import IUser from "../../../interfaces/IUser";

export default async (req: ExReq, res: ExRes) => {
  try {
    const { foreignId } = req.query;

    if (!foreignId || typeof foreignId !== "string") {
      res.status(400).json({
        error: "Missing or invalid foreign user ID.",
        code: "user/invalid-identifier",
      });
      return;
    }

    const projectId = req.project.id;

    let user = (await User.findOne({
      where: { foreignId, projectId },
    })) as IUser | null;

    if (!user) {
      res.status(404).json({
        error: "User not found",
        code: "user/not-found",
      });
      return;
    }

    // Fetch user again without sensitive fields
    const cleanUser = await User.findByPk(user.id, {
      attributes: {
        exclude: [
          "hash",
          "salt",
          "email",
          "isVerified",
          "isActive",
          "lastActive",
          "secureMetadata",
        ],
      },
    });

    res.status(200).json(cleanUser?.toJSON());
  } catch (err: any) {
    console.error("Error fetching/creating/updating user:", err);
    res.status(500).json({
      error: "Internal server error",
      code: "user/server-error",
      details: err.message,
    });
  }
};
