import { Request as ExReq, Response as ExRes } from "express";
import { User } from "../../../models";
import { Op } from "sequelize";
import { getCoreConfig } from "../../../config";

export default async (req: ExReq, res: ExRes) => {
  try {
    const { query } = req.query;
    const projectId = req.project.id;
    const { sequelize } = getCoreConfig();

    if (!query || typeof query !== "string") {
      res.status(400).json({
        error: "Missing or invalid query parameter",
        code: "user/invalid-query",
      });
      return;
    }

    const suggestions = await User.findAll({
      where: {
        projectId,
        username: {
          [Op.iLike]: `%${query}%`, // Case-insensitive search for usernames containing the query
        },
      },
      order: [
        [
          sequelize.literal(`"username" ILIKE '${query}%'`), // Prioritize usernames starting with the query
          "DESC",
        ],
        ["username", "ASC"], // Secondary alphabetical ordering
      ],
      limit: 5,
      attributes: {
        exclude: [
          "hash",
          "salt",
          "email",
          "isVerified",
          "isActive",
          "lastActive",
        ],
      },
    });

    res.status(200).json(suggestions.map((i) => i.toJSON()));
  } catch (err: any) {
    console.error("Error fetching user suggestions: ", err);
    res.status(500).json({
      error: "Internal server error",
      code: "user/server-error",
      details: err.message,
    });
  }
};
