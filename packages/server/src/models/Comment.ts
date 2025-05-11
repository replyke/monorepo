import { Model, DataTypes, Sequelize, CreationOptional } from "sequelize";

import {
  ICommentAttributes,
  ICommentCreationAttributes,
} from "../interfaces/IComment";
import IMention from "../interfaces/IMention";
import IGif from "../interfaces/IGif";
import Entity from "./Entity";
import User from "./User";
import Report from "./Report";

export default class Comment
  extends Model<ICommentAttributes, ICommentCreationAttributes>
  implements ICommentAttributes
{
  declare id: string;
  declare projectId: string;
  declare entityId: string;
  declare parentId: string;
  declare userId: string;
  declare referenceId: string | null;
  declare foreignId: string | null;
  declare content: string | null;
  declare gif: IGif | null;
  declare mentions: IMention[]; // You can type this better if you want
  declare upvotes: string[];
  declare downvotes: string[];
  declare parentDeletedAt: Date | null;
  declare referencedCommentId: string | null;
  declare attachments: Record<string, any>[];
  declare metadata: Record<string, any>;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date>;

  static initModel(sequelize: Sequelize): void {
    Comment.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        projectId: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        referenceId: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        foreignId: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        entityId: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        parentId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        content: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        gif: {
          type: DataTypes.JSON,
          allowNull: true,
        },
        mentions: {
          type: DataTypes.ARRAY(DataTypes.JSONB),
          allowNull: false,
          defaultValue: [],
        },
        upvotes: {
          type: DataTypes.ARRAY(DataTypes.UUID),
          allowNull: false,
          defaultValue: [],
        },
        downvotes: {
          type: DataTypes.ARRAY(DataTypes.UUID),
          allowNull: false,
          defaultValue: [],
        },
        parentDeletedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        referencedCommentId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        attachments: {
          type: DataTypes.ARRAY(DataTypes.JSONB),
          allowNull: false,
          defaultValue: [],
        },
        metadata: {
          type: DataTypes.JSONB,
          allowNull: false,
          defaultValue: {},
          validate: {
            notTooLarge(value: object | null) {
              const MAX_SIZE = 10240; // 10 KB
              if (value !== null) {
                const size = Buffer.byteLength(JSON.stringify(value), "utf8");
                if (size > MAX_SIZE) {
                  throw new Error(
                    `Metadata exceeds the size limit of ${MAX_SIZE} bytes.`
                  );
                }
              }
            },
          },
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        deletedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "Comment",
        tableName: "Comments",
        timestamps: true,
        paranoid: true,
      }
    );
  }

  /**
   * Define associations to other models
   */
  static associate(): void {
    Comment.belongsTo(Entity, {
      foreignKey: "entityId",
      onDelete: "CASCADE", // Ensures each Comment belongs to an Entity
      as: "entity", // Define the alias here
    });

    // We don't cascade delete comments when users are remove to keep conversation integrity. We will just not show the user if there is no one
    Comment.belongsTo(User, {
      foreignKey: "userId",
      as: "user", // Define the alias here
    });

    // Self-referential relationship between Comment and itself
    // We don't cascade deletion. Currently, if a comment is deleted, the replies are not deleted.
    Comment.hasMany(Comment, {
      foreignKey: "parentId", // This field refers to the parent comment
      as: "replies", // Alias for the relation
    });

    Comment.belongsTo(Comment, {
      foreignKey: "parentId", // Reference to the parent comment
      as: "parentComment", // Alias for the parent folder relation
    });

    Comment.hasMany(Report, {
      foreignKey: "targetId",
      constraints: false,
      onDelete: "CASCADE",
      scope: { targetType: "Comment" }, // Ensures this association only applies to Reports for Comments
    });
  }
}
