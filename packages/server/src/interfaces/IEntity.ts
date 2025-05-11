import { Model, Optional } from "sequelize";
import IMention from "./IMention";
import ILocation from "./ILocation";

// Main IEntity attributes interface refactored to camelCase
export interface IEntityAttributes {
  id: string;
  shortId: string | null; // TODO: backfill null values and make this required
  projectId: string;
  referenceId: string | null; // TODO: Need to sunset eventually - keeping for now as sunsetting means deleting the column
  foreignId: string | null;
  sourceId: string | null;
  resourceId: string | null; // TODO remove after successful migration
  userId: string | null;
  title: string | null;
  content: string | null;
  mentions: IMention[]; // Required
  media: Record<string, any>[]; // TODO: Need to sunset eventually - keeping for now as sunsetting means deleting the column
  attachments: Record<string, any>[];
  keywords: string[];
  location?: ILocation; // Optional location stored as GeoJSON
  upvotes: string[];
  downvotes: string[]; // Array of user IDs or strings
  sharesCount: number;
  views: number;
  score: number;
  scoreUpdatedAt: Date; // Use camelCase for `score_last_update`
  metadata: Record<string, any>;
  createdAt: Date; // Use camelCase for `created_at`
  updatedAt: Date; // Use camelCase for `updated_at`
  deletedAt: Date | null; // Use camelCase for `updated_at`
}

// Creation attributes: mark fields as optional when creating an entity
export interface IEntityCreationAttributes
  extends Optional<
    IEntityAttributes,
    | "id"
    | "shortId"
    | "sourceId"
    | "resourceId"
    | "mentions"
    | "media"
    | "attachments"
    | "keywords"
    | "location"
    | "upvotes"
    | "downvotes"
    | "sharesCount"
    | "views"
    | "score"
    | "scoreUpdatedAt"
    | "metadata"
    | "createdAt"
    | "updatedAt"
  > {}

// IEntity interface extending Sequelize's Model
export default interface IEntity
  extends Model<IEntityAttributes, IEntityCreationAttributes>,
    IEntityAttributes {}
