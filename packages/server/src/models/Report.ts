import { Model, DataTypes, Sequelize, CreationOptional } from "sequelize";

import {
  IReportAttributes,
  IReportCreationAttributes,
} from "../interfaces/IReport";
import Entity from "./Entity";
import Comment from "./Comment";

export default class Report
  extends Model<IReportAttributes, IReportCreationAttributes>
  implements IReportAttributes
{
  declare id: string;
  declare projectId: string;
  declare targetId: string;
  declare reporters: string[];
  declare targetType: "Comment" | "Entity";
  declare reason: string;
  declare details: string | null;
  declare status:
    | "Pending"
    | "On Hold"
    | "Escalated"
    | "Dismissed"
    | "Actioned";
  declare actionTaken: string | null;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date>;

  static initModel(sequelize: Sequelize): void {
    Report.init(
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
        targetId: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        reporters: {
          type: DataTypes.ARRAY(DataTypes.UUID),
          allowNull: false,
          defaultValue: [],
        },
        targetType: {
          type: DataTypes.ENUM("Comment", "Entity"),
          allowNull: false,
        },
        reason: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        details: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        status: {
          type: DataTypes.ENUM(
            "Pending",
            "On Hold",
            "Escalated",
            "Dismissed",
            "Actioned"
          ),
          defaultValue: "Pending",
          allowNull: false,
        },
        actionTaken: {
          type: DataTypes.STRING(255),
          allowNull: true,
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
        modelName: "Report",
        tableName: "Reports", // ✅ Capitalized and plural
        timestamps: true,
        paranoid: true,
      }
    );
  }

  /**
   * Define associations to other models
   */
  static associate(): void {
    Report.belongsTo(Entity, {
      foreignKey: "targetId",
      constraints: false, // Disable FK constraints since it can point to different models
      scope: { targetType: "Entity" }, // Ensures this association only applies to Entities
      onDelete: "CASCADE",
    });

    Report.belongsTo(Comment, {
      foreignKey: "targetId",
      constraints: false,
      scope: { targetType: "Comment" }, // Ensures this association only applies to Comments
      onDelete: "CASCADE",
    });
  }
}
