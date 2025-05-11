import { Model, Optional } from "sequelize";
import IEntity from "./IEntity";

// Define the attributes of the BookmarksFolder model
export interface IListAttributes {
  id: string;
  projectId: string;
  userId: string;
  parentId: string | null;
  isRoot: boolean;
  name: string;
  entityIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Define the creation attributes (optional fields during creation)
export interface IListCreationAttributes
  extends Optional<
    IListAttributes,
    "id" | "createdAt" | "updatedAt" | "entityIds" | "isRoot"
  > {}

// Define the IBookmarksFolder interface extending Sequelize's Model
export default interface IList
  extends Model<IListAttributes, IListCreationAttributes>,
    IListAttributes {
  entities?: IEntity[];
}
