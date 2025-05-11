import { Model, Optional } from "sequelize";

// Define the attributes of the User model
export interface ITokenAttributes {
  id: string;
  projectId: string;
  userId: string;
  refreshToken: string | null;
  createdAt: Date; // Timestamp for creation
  updatedAt: Date; // Timestamp for updating
}

// Define the creation attributes (attributes that may be optional when creating)
export interface ITokenCreationAttributes
  extends Optional<
    ITokenAttributes,
    "id" | "createdAt" | "updatedAt" | "refreshToken"
  > {}

// Define the IToken interface extending Sequelize's Model
export default interface IToken
  extends Model<ITokenAttributes, ITokenCreationAttributes>,
    ITokenAttributes {}
