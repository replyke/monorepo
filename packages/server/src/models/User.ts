import { Model, DataTypes, Sequelize, CreationOptional } from "sequelize";
import { IUserAttributes, IUserCreationAttributes } from "../interfaces/IUser";
import { ISuspension } from "../interfaces/ISuspension";
import Token from "./Token";
import Entity from "./Entity";
import Comment from "./Comment";
import List from "./List";
import AppNotification from "./AppNotification";
import Follow from "./Follow";

export default class User
  extends Model<IUserAttributes, IUserCreationAttributes>
  implements IUserAttributes
{
  declare id: string;
  declare projectId: string;
  declare role: "admin" | "editor" | "visitor";
  declare referenceId: string | null;
  declare foreignId: string | null;
  declare hash: string | null;
  declare salt: string | null;
  declare email: string;
  declare name: string | null;
  declare username: string | null;
  declare avatar: string | null;
  declare bio: string | null;
  declare birthdate: Date | null;
  declare location: any | null; // optional: replace `any` with a Point type if needed
  declare isVerified: boolean;
  declare isActive: boolean;
  declare lastActive: Date;
  declare suspension: ISuspension;
  declare reputation: number;
  declare metadata: Record<string, any>;
  declare secureMetadata: Record<string, any>;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date> | null;

  static initModel(sequelize: Sequelize): void {
    User.init(
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
        role: {
          type: DataTypes.ENUM("admin", "editor", "visitor"),
          allowNull: false,
          defaultValue: "visitor",
        },
        referenceId: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        foreignId: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        hash: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        salt: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        email: {
          type: DataTypes.STRING,
          allowNull: true,
          validate: {
            isEmail: true,
          },
          set(value: string | null) {
            this.setDataValue("email", value?.trim() ?? null);
          },
        },
        name: {
          type: DataTypes.STRING,
          allowNull: true,
          set(value: string | null | undefined) {
            this.setDataValue("name", value?.trim() ?? null);
          },
        },
        username: {
          type: DataTypes.STRING,
          allowNull: true,
          set(value: string | null | undefined) {
            this.setDataValue("username", value?.trim() ?? null);
          },
        },
        avatar: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        bio: {
          type: DataTypes.STRING(300),
          allowNull: true,
          set(value: string | null | undefined) {
            this.setDataValue("bio", value?.trim() ?? null);
          },
        },
        birthdate: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        location: {
          type: DataTypes.GEOGRAPHY("POINT"),
          allowNull: true,
        },
        isVerified: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
        },
        isActive: {
          type: DataTypes.BOOLEAN,
          defaultValue: true,
        },
        lastActive: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        reputation: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
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
        secureMetadata: {
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
        modelName: "User",
        tableName: "Users",
        timestamps: true,
        paranoid: true,
        indexes: [
          {
            unique: true,
            fields: ["projectId", "referenceId"],
          },
          {
            unique: true,
            fields: ["projectId", "foreignId"],
          },
          {
            unique: true,
            fields: ["projectId", "email"],
          },
          {
            unique: true,
            fields: ["projectId", "username"],
          },
          {
            fields: ["location"],
            using: "gist",
          },
        ],
      }
    );
  }

  /**
   * Define associations to other models
   */
  static associate(): void {
    User.hasMany(Token, {
      foreignKey: "userId",
      onDelete: "CASCADE", // If a User is deleted, all their Tokens are deleted
    });

    User.hasMany(Entity, {
      foreignKey: "userId",
    });

    User.hasMany(Comment, {
      foreignKey: "userId",
    });

    User.hasMany(List, {
      foreignKey: "userId",
      onDelete: "CASCADE", // If a User is deleted, all its Lists are deleted
    });

    User.hasMany(AppNotification, {
      foreignKey: "userId",
      onDelete: "CASCADE", // If a User is deleted, all their Notification are deleted
    });

    User.hasMany(Follow, {
      foreignKey: "followerId",
      as: "following", // Users this user follows
      onDelete: "CASCADE", // Ensure cascade delete
    });

    User.hasMany(Follow, {
      foreignKey: "followedId",
      as: "followers", // Users following this user
      onDelete: "CASCADE", // Ensure cascade delete
    });
  }
}
