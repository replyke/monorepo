import { Request as ExReq, Response as ExRes } from "express";
import { User } from "../../../models";

export default async (req: ExReq, res: ExRes) => {
  try {
    const { userId } = req.params;

    if (!userId || typeof userId !== "string") {
      res.status(400).json({
        error: "Missing or invalid userId in request parameters",
        code: "user/invalid-user-id",
      });
      return;
    }

    // Perform the query on the Entity model with pagination, sorting, and filtering
    const user = await User.findByPk(userId, {
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

    if (!user) {
      res.status(404).json({
        error: "User not found",
        code: "user/not-found",
      });
      return;
    }

    res.status(200).json(user.toJSON());
  } catch (err: any) {
    console.error("Error fetching user: ", err);
    res.status(500).json({
      error: "Internal server error",
      code: "user/server-error",
      details: err.message,
    });
  }
};
