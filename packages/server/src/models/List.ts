import { Model, DataTypes, Sequelize, CreationOptional } from "sequelize";
import { IListAttributes, IListCreationAttributes } from "../interfaces/IList";
import User from "./User";

export default class List
  extends Model<IListAttributes, IListCreationAttributes>
  implements IListAttributes
{
  declare id: string;
  declare projectId: string;
  declare userId: string;
  declare parentId: string | null;
  declare name: string;
  declare isRoot: boolean;
  declare entityIds: string[];

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  static initModel(sequelize: Sequelize): void {
    List.init(
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
        parentId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        isRoot: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        entityIds: {
          type: DataTypes.ARRAY(DataTypes.UUID),
          allowNull: false,
          defaultValue: [],
          validate: {
            isUnique(value: string[]) {
              const unique = new Set(value);
              if (unique.size !== value.length) {
                throw new Error("Duplicate entity IDs are not allowed");
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
      },
      {
        sequelize,
        modelName: "List",
        tableName: "Lists", // ✅ Capitalized + plural
        timestamps: true,
        indexes: [
          {
            unique: true,
            fields: ["userId", "isRoot"],
            where: {
              isRoot: true, // Partial unique constraint
            },
          },
          {
            unique: true,
            fields: ["projectId", "parentId", "name"],
          },
        ],
      }
    );
  }

  /**
   * Define associations to other models
   */
  static associate(): void {
    List.belongsTo(User, {
      foreignKey: "userId",
      onDelete: "CASCADE", // Ensures each List belongs to a User
    });

    // Nested lists: A List can have multiple sub-lists, referencing other Lists by parentId
    List.hasMany(List, {
      foreignKey: "parentId",
      constraints: false,
      as: "subLists",
      scope: {
        parentType: "List",
      },
      onDelete: "CASCADE",
    });

    List.belongsTo(List, {
      foreignKey: "parentId",
      constraints: false,
      as: "parentList",
      scope: {
        parentType: "List",
      },
      onDelete: "CASCADE",
    });
  }
}
