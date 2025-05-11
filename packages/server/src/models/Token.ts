import { Model, DataTypes, Sequelize, CreationOptional } from "sequelize";

import {
  ITokenAttributes,
  ITokenCreationAttributes,
} from "../interfaces/IToken";
import User from "./User";

export default class Token
  extends Model<ITokenAttributes, ITokenCreationAttributes>
  implements ITokenAttributes
{
  declare id: string;
  declare projectId: string;
  declare userId: string;
  declare refreshToken: string | null;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  static initModel(sequelize: Sequelize): void {
    Token.init(
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
        refreshToken: {
          type: DataTypes.TEXT,
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
      },
      {
        sequelize,
        modelName: "Token",
        tableName: "Tokens",
        timestamps: true,
      }
    );
  }

  /**
   * Define associations to other models
   */
  static associate(): void {
    Token.belongsTo(User, {
      foreignKey: "userId",
      onDelete: "CASCADE", // Ensures each Token belongs to a User
    });
  }
}
