import { Model, DataTypes, Sequelize, CreationOptional } from "sequelize";

import {
  IFollowAttributes,
  IFollowCreationAttributes,
} from "../interfaces/IFollow";
import User from "./User";

export default class Follow
  extends Model<IFollowAttributes, IFollowCreationAttributes>
  implements IFollowAttributes
{
  declare id: string;
  declare projectId: string;
  declare followerId: string;
  declare followedId: string;
  declare createdAt: CreationOptional<Date>;

  static initModel(sequelize: Sequelize): void {
    Follow.init(
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
        followerId: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        followedId: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        modelName: "Follow",
        tableName: "Follows", // ✅ Capitalized + plural
        timestamps: false, // Only createdAt, no updatedAt
      }
    );
  }

  /**
   * Define associations to other models
   */
  static associate(): void {
    // The user who follows
    Follow.belongsTo(User, {
      foreignKey: "followerId",
      as: "follower",
      onDelete: "CASCADE",
    });
    // The user being followed
    Follow.belongsTo(User, {
      foreignKey: "followedId",
      as: "followed",
      onDelete: "CASCADE",
    });
  }
}
