import { Literal } from "sequelize/types/utils";
import { User } from "../models";
import { Sequelize } from "sequelize";

export const commentParams = {
  attributes: {
    include: [
      [
        // Subquery to count replies for each comment
        Sequelize.literal(`(
              SELECT COUNT(*)::int
              FROM "Comments" AS "reply"
              WHERE "reply"."parentId" = "Comment"."id"
              AND "reply"."deletedAt" IS NULL
              AND "reply"."parentDeletedAt" IS NULL
            )`),
        "repliesCount",
      ] as [Literal, string], // Explicitly defining this as [Literal, string],
    ],
  },
  include: [
    {
      model: User,
      as: "user", // Assuming you used `as: "user"` in the Comment-User association
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
      }, // Customize fields as needed
    },
  ],
};

export const entityParams = {
  attributes: {
    include: [
      [
        // Subquery to count comments for each entity
        Sequelize.literal(`(
          SELECT COUNT(*)::int
          FROM "Comments" AS "comment"
          WHERE "comment"."entityId" = "Entity"."id"
          AND "comment"."deletedAt" IS NULL
          AND "comment"."parentDeletedAt" IS NULL
        )`),
        "repliesCount",
      ] as [Literal, string],
      [
        // Subquery to get the topComment with user details
        Sequelize.literal(`(
          SELECT row_to_json(c)
          FROM (
            SELECT 
              "comment"."id",
              "comment"."content",
              array_length("comment"."upvotes", 1) AS "upvotesCount",
              json_build_object(
                'id', "user"."id",
                'name', "user"."name",
                'username', "user"."username",
                'avatar', "user"."avatar"
              ) AS "user"
            FROM "Comments" AS "comment"
            LEFT JOIN "Users" AS "user" ON "user"."id" = "comment"."userId"
            WHERE "comment"."entityId" = "Entity"."id"
            AND "comment"."deletedAt" IS NULL
            AND "comment"."parentDeletedAt" IS NULL
            ORDER BY array_length("comment"."upvotes", 1) DESC
            LIMIT 1
          ) c
        )`),
        "topComment",
      ] as [Literal, string],
    ],
  },
  include: [
    {
      model: User,
      as: "user", // Assuming you used `as: "user"` in the Comment-User association
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
      }, // Customize fields as needed
    },
  ],
};
