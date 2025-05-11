import { DataTypes, Model, Sequelize, CreationOptional } from "sequelize";
import ShortUniqueId from "short-uuid";

import {
  IEntityAttributes,
  IEntityCreationAttributes,
} from "../interfaces/IEntity";
import IMention from "../interfaces/IMention";
import Comment from "./Comment";
import User from "./User";
import Report from "./Report";

export default class Entity
  extends Model<IEntityAttributes, IEntityCreationAttributes>
  implements IEntityAttributes
{
  declare id: string;
  declare projectId: string;
  declare userId: string;
  declare shortId: string;
  declare referenceId: string | null;
  declare foreignId: string | null;
  declare sourceId: string | null;
  declare resourceId: string | null; // TODO: remove after successful migration
  declare title: string | null;
  declare content: string | null;
  declare media: Record<string, any>[];
  declare attachments: Record<string, any>[];
  declare mentions: IMention[];
  declare upvotes: string[];
  declare downvotes: string[];
  declare sharesCount: number;
  declare views: number;
  declare location: any; // can use PostGIS Point type if available
  declare keywords: string[];
  declare score: number;
  declare scoreUpdatedAt: Date;
  declare metadata: Record<string, any>;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date>;

  static initModel(sequelize: Sequelize): void {
    Entity.init(
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
          allowNull: true,
        },
        shortId: {
          type: DataTypes.STRING,
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
        sourceId: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        resourceId: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        title: {
          type: DataTypes.TEXT,
          allowNull: true,
          validate: { len: [0, 300] },
          set(value: string | null) {
            const newValue = value && value.trim() !== "" ? value : null;
            this.setDataValue("title", newValue);
          },
        },
        content: {
          type: DataTypes.TEXT,
          allowNull: true,
          validate: { len: [0, 100000] },
          set(value: string | null) {
            const newValue = value && value.trim() !== "" ? value : null;
            this.setDataValue("content", newValue);
          },
        },
        media: {
          type: DataTypes.ARRAY(DataTypes.JSONB),
          allowNull: false,
          defaultValue: [],
          set(value: any[]) {
            const sanitized = Array.isArray(value)
              ? value.filter(
                  (item) =>
                    item && typeof item === "object" && !Array.isArray(item)
                )
              : [];
            this.setDataValue("media", sanitized);
          },
          validate: {
            isArrayOfObjects(value: any[]) {
              if (!Array.isArray(value)) {
                throw new Error("Value must be an array.");
              }
              for (const item of value) {
                if (!item || typeof item !== "object" || Array.isArray(item)) {
                  throw new Error("Each item must be a non-null object.");
                }
              }
            },
          },
        },
        attachments: {
          type: DataTypes.ARRAY(DataTypes.JSONB),
          allowNull: false,
          defaultValue: [],
          set(value: any[]) {
            const sanitized = Array.isArray(value)
              ? value.filter(
                  (item) =>
                    item && typeof item === "object" && !Array.isArray(item)
                )
              : [];
            this.setDataValue("attachments", sanitized);
          },
          validate: {
            isArrayOfObjects(value: any[]) {
              if (!Array.isArray(value)) {
                throw new Error("Value must be an array.");
              }
              for (const item of value) {
                if (!item || typeof item !== "object" || Array.isArray(item)) {
                  throw new Error("Each item must be a non-null object.");
                }
              }
            },
          },
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
        sharesCount: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        views: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 1,
        },
        location: {
          type: DataTypes.GEOGRAPHY("POINT"),
          allowNull: true,
        },
        keywords: {
          type: DataTypes.ARRAY(DataTypes.TEXT),
          allowNull: false,
          defaultValue: [],
          set(value: string[]) {
            const filtered = value.filter((k) => k.trim() !== "");
            this.setDataValue("keywords", filtered);
          },
        },
        score: {
          type: DataTypes.FLOAT,
          allowNull: false,
          defaultValue: 2,
        },
        scoreUpdatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        metadata: {
          type: DataTypes.JSONB,
          allowNull: false,
          defaultValue: {},
          validate: {
            notTooLarge(value: object | null) {
              const MAX_SIZE = 10240;
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
        modelName: "Entity",
        tableName: "Entities",
        timestamps: true,
        paranoid: true,
        indexes: [
          { unique: true, fields: ["projectId", "referenceId"] },
          { unique: true, fields: ["projectId", "shortId"] },
          { fields: ["location"], using: "gist" },
          { fields: ["score"] },
          {
            fields: ["title"],
            using: "gin",
            operator: "gin_trgm_ops",
          },
          {
            fields: ["content"],
            using: "gin",
            operator: "gin_trgm_ops",
          },
          {
            fields: ["keywords"],
            using: "gin",
          },
        ],
      }
    );

    Entity.beforeValidate((instance) => {
      // only generate if it's not already set (e.g. on updates)
      if (!instance.shortId) {
        // id will have its defaultValue (UUIDV4) applied already
        instance.shortId = ShortUniqueId().fromUUID(instance.id!);
      }
    });
  }

  /**
   * Define associations to other models
   */
  static associate(): void {
    Entity.hasMany(Comment, {
      foreignKey: "entityId",
      onDelete: "CASCADE", // If an Entity is deleted, all its Comments are deleted
    });

    // We don't cascade delete comments when users are remove to keep conversation integrity. We will just not show the user if there is no one
    Entity.belongsTo(User, {
      foreignKey: "userId",
      as: "user", // Define the alias here
    });

    Entity.hasMany(Report, {
      foreignKey: "targetId",
      constraints: false, // Disable FK constraints for polymorphic relation
      onDelete: "CASCADE",
      scope: { targetType: "Entity" }, // Ensures this association only applies to Reports for Entities
    });
  }
}
