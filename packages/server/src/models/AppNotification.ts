import { Model, DataTypes, Sequelize, CreationOptional } from "sequelize";

import {
  IAppNotificationAttributes,
  IAppNotificationCreationAttributes,
} from "../interfaces/IAppNotification";
import User from "./User";

export default class AppNotification
  extends Model<IAppNotificationAttributes, IAppNotificationCreationAttributes>
  implements IAppNotificationAttributes
{
  declare id: string;
  declare projectId: string;
  declare userId: string;
  declare type: string;
  declare isRead: boolean;
  declare action: string;
  declare metadata: Record<string, any>;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  static initModel(sequelize: Sequelize): void {
    AppNotification.init(
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
        type: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        isRead: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        action: {
          type: DataTypes.STRING,
          allowNull: false,
          defaultValue: "invalid-action",
        },
        metadata: {
          type: DataTypes.JSONB,
          allowNull: false,
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
      },
      {
        sequelize,
        modelName: "AppNotification",
        tableName: "AppNotifications",
        timestamps: true,
      }
    );
  }

  /**
   * Define associations to other models
   */
  static associate(): void {
    AppNotification.belongsTo(User, {
      foreignKey: "userId",
      onDelete: "CASCADE", // Ensures each Notification belongs to a User
    });
  }
}
