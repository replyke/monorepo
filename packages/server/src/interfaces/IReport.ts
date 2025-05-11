import { Model } from "sequelize";

export interface IReportAttributes {
  id: string; // UUID for unique identification
  projectId: string; // The ID of the user who submitted the report
  reporters: string[]; // Array of user IDs who reported this post
  targetId: string; // The ID of the reported item (comment or entity)
  targetType: "Comment" | "Entity"; // Specifies whether the target is a comment or an entity
  reason: string; // Reason for the report (e.g., "spam", "harassment", etc.)
  details: string | null; // Optional additional details provided by the reporter
  status: "Pending" | "On Hold" | "Escalated" | "Dismissed" | "Actioned"; // Status of the report
  actionTaken: string | null; // Optional description of the action taken if status is 'Actioned'
  createdAt: Date; // Timestamp of when the report was created
  updatedAt: Date; // Timestamp of the last update to the report
  deletedAt: Date | null;
}

export interface IReportCreationAttributes
  extends Omit<
    IReportAttributes,
    "id" | "status" | "createdAt" | "updatedAt" | "actionTaken"
  > {
  // id, status, createdAt, updatedAt, and actionTaken are auto-generated or set later
}

// Define the IComment interface extending Sequelize's Model
export default interface IReport
  extends Model<IReportAttributes, IReportCreationAttributes>,
    IReportAttributes {}
