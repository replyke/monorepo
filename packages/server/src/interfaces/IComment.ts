import { Model, Optional } from "sequelize";
import IMention from "./IMention";
import IGif from "./IGif";

// Define the attributes of the Comment model
export interface ICommentAttributes {
  id: string; // Sequelize auto-generates this
  projectId: string; // Required
  referenceId: string | null; // TODO: Need to sunset eventually - keeping for now as sunsetting means deleting the column
  foreignId: string | null;
  userId: string | null; // user id
  entityId: string; // Required
  parentId: string | null; // Optional parent comment (if it's a reply)
  referencedCommentId: string | null;
  content: string | null; // Required
  gif: IGif | null; //
  mentions: IMention[]; // Required
  upvotes: string[]; // Array of user IDs
  downvotes: string[]; // Array of user IDs
  parentDeletedAt: Date | null;
  attachments: Record<string, any>[];
  metadata: Record<string, any>;

  createdAt: Date; // Timestamp for creation
  updatedAt: Date; // Timestamp for updating
  deletedAt: Date | null; // Timestamp for deletion
}

// Define the creation attributes (optional fields when creating a comment)
export interface ICommentCreationAttributes
  extends Optional<
    ICommentAttributes,
    | "id"
    | "mentions"
    | "upvotes"
    | "downvotes"
    | "parentDeletedAt"
    | "createdAt"
    | "updatedAt"
    | "deletedAt"
  > {}

// Define the IComment interface extending Sequelize's Model
export default interface IComment
  extends Model<ICommentAttributes, ICommentCreationAttributes>,
    ICommentAttributes {}
