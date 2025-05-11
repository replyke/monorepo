import { Request as ExReq, Response as ExRes } from "express";

import { Entity, Comment } from "../../../models";
import IComment from "../../../interfaces/IComment";
import { commentParams } from "../../../constants/sequelize-query-params";
import { getCoreConfig } from "../../../config";

export default async (req: ExReq, res: ExRes) => {
  try {
    const {
      entityId,
      userId,
      parentId,
      sortBy = "new" as "new" | "old" | "top" | "controversial",
      page = 1,
      limit = 10,
      includeEntity,
    } = req.query;
    const projectId = req.project.id;

    if (
      (!entityId && !userId && !parentId) ||
      (entityId && typeof entityId !== "string") ||
      (userId && typeof userId !== "string") ||
      (parentId && typeof parentId !== "string")
    ) {
      res.status(400).json({
        error: "Invalid request data",
        code: "comment/invalid-request",
      });
      return;
    }

    // Convert 'limit' and 'page' to numbers and validate them.
    let limitAsNumber = Number(limit);
    if (isNaN(limitAsNumber) || limitAsNumber <= 0) {
      res.status(400).json({
        error: "Invalid request: limit must be a positive number.",
        code: "comment/invalid-limit",
      });
      return;
    }
    limitAsNumber = Math.min(limitAsNumber, 100);

    const pageAsNumber = Number(page);
    if (isNaN(pageAsNumber) || pageAsNumber < 1 || pageAsNumber % 1 !== 0) {
      res.status(400).json({
        error: "Invalid request: page must be a whole number greater than 0.",
        code: "comment/invalid-page",
      });
      return;
    }

    const { sequelize } = getCoreConfig();
    // Define the sort filter based on 'sortBy' query parameter.
    let order: any[] = []; // Sequelize uses `order` for sorting

    switch (sortBy) {
      case "top":
        order = [
          [
            sequelize.literal(`
            (COALESCE(array_length("Comment"."upvotes", 1), 0) - COALESCE(array_length("Comment"."downvotes", 1), 0)) DESC,
            COALESCE(array_length("Comment"."upvotes", 1), 0) DESC
            `),
          ],
          ["createdAt", "DESC"],
        ];
        break;
      case "new":
        order = [["createdAt", "DESC"]];
        break;
      case "old":
        order = [["createdAt", "ASC"]];
        break;

      case "controversial":
        order = [
          [
            sequelize.literal(`
                  LOG(COALESCE(array_length("Comment"."upvotes", 1), 0) + COALESCE(array_length("Comment"."downvotes", 1), 0) + 1) *
                  (LEAST(COALESCE(array_length("Comment"."upvotes", 1), 0), COALESCE(array_length("Comment"."downvotes", 1), 0)) /
                   GREATEST(COALESCE(array_length("Comment"."upvotes", 1), 0), COALESCE(array_length("Comment"."downvotes", 1), 0)))
                `),
            "DESC",
          ],
          ["createdAt", "DESC"], // Secondary sort by creation time for ties
        ];
    }

    // Calculate the offset for pagination.
    const offset = (pageAsNumber - 1) * limitAsNumber;

    const whereCondition: any = {
      projectId,
    };

    if (entityId) {
      whereCondition.entityId = entityId;
    }

    if (userId) {
      whereCondition.userId = userId;
    }

    if (parentId) {
      whereCondition.parentId = parentId;
    }

    // Clone the commentParams to safely modify includes
    const queryOptions: any = { ...commentParams };

    // Conditionally include the Entity model if includeEntity is truthy
    if (includeEntity === "true") {
      // Ensure our queryOptions.include is an array, then push the Entity model
      if (!Array.isArray(queryOptions.include)) {
        queryOptions.include = [];
      }
      queryOptions.include.push({
        model: Entity,
        as: "entity",
        attributes: {
          exclude: ["upvotes", "downvotes"], // Adjust as needed
        },
      });
    }

    // Fetch comments based on filters, pagination, and sorting.
    const comments = (await Comment.findAll({
      where: whereCondition,
      limit: limitAsNumber,
      offset,
      order, // Sorting by likesCount and/or createdAt
      ...commentParams,
    })) as IComment[];

    // Respond with the fetched comments.
    res.status(200).json(comments.map((i) => i.toJSON()));
  } catch (err: any) {
    console.error("Error fetching comments: ", err);
    res.status(500).json({
      error: "Internal server error.",
      code: "comment/server-error",
      details: err.message,
    });
  }
};
