import { Model, Optional } from "sequelize";
import ILocation from "./ILocation";

export // Define the attributes of the User model
interface IUserAttributes {
  id: string;
  projectId: string;
  referenceId: string | null; // TODO: Need to sunset eventually - keeping for now as sunsetting means deleting the column
  foreignId: string | null;
  role: "admin" | "editor" | "visitor";
  hash: string | null;
  salt: string | null;
  email: string | null;
  name: string | null;
  username: string | null;
  avatar: string | null;
  bio: string | null;
  birthdate: Date | null;
  reputation: number;
  location: ILocation | null;
  isVerified: boolean;
  isActive: boolean;
  lastActive: Date;

  metadata: Record<string, any>;
  secureMetadata: Record<string, any>;
  createdAt: Date; // Timestamp for creation
  updatedAt: Date; // Timestamp for updating
  deletedAt: Date | null; // Timestamp for updating
}

// Define the creation attributes (attributes that may be optional when creating)
export interface IUserCreationAttributes
  extends Optional<
    IUserAttributes,
    | "id"
    | "referenceId"
    | "createdAt"
    | "updatedAt"
    | "deletedAt"
    | "role"
    | "name"
    | "username"
    | "avatar"
    | "hash"
    | "salt"
    | "email"
    | "reputation"
    | "metadata"
    | "secureMetadata"
    | "isVerified"
    | "isActive"
    | "lastActive"
  > {}

// Define the IUser interface extending Sequelize's Model
export default interface IUser
  extends Model<IUserAttributes, IUserCreationAttributes>,
    IUserAttributes {}
