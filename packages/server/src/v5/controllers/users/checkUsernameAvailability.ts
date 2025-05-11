import { Request as ExReq, Response as ExRes } from "express";
import { User } from "../../../models";

export default async (req: ExReq, res: ExRes) => {
  try {
    const { username } = req.query;
    const projectId = req.project.id;

    if (!username || typeof username !== "string") {
      res.status(400).json({
        error: "Username is required and must be a string.",
        code: "username/invalid-input",
      });
      return;
    }
    // Check if the username is taken within the specified project
    const user = await User.findOne({
      where: {
        projectId,
        username,
      },
    });

    if (user) {
      res.status(200).json({
        available: false,
      });
      return;
    }

    res.status(200).json({
      available: true,
    });
  } catch (error: any) {
    console.error("Error checking username availability:", error);
    res.status(500).json({
      error: "An error occurred while checking username availability.",
      code: "username/server-error",
      details: error.message,
    });
  }
};
