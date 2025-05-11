import { Model, Optional } from "sequelize";

// Define the attributes for the Follows model
export interface IFollowAttributes {
  id: string;
  projectId: string;
  followerId: string; // The user who follows
  followedId: string; // The user being followed
  createdAt: Date; // Timestamp for creation
}

// Define the creation attributes (no optional fields except createdAt)
export interface IFollowCreationAttributes
  extends Optional<IFollowAttributes, "id" | "createdAt"> {}

// Define the IFollow interface extending Sequelize's Model
export default interface IFollow
  extends Model<IFollowAttributes, IFollowCreationAttributes>,
    IFollowAttributes {}
