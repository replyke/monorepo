import { Entity } from "./Entity";
import { Comment } from "./Comment";
import { Space } from "./Space";

export type ReportTargetType = "entity" | "comment";
export type ReportStatus =
  | "pending"
  | "on-hold"
  | "escalated"
  | "dismissed"
  | "actioned";

export interface UserReport {
  id: string;
  projectId: string;
  reportId: string;
  userId: string;
  reason: string;
  details: string | null;
  createdAt: Date;
}

export interface Report {
  id: string;
  projectId: string;
  spaceId: string | null;
  targetId: string;
  targetType: ReportTargetType;
  status: ReportStatus;
  reporterCount: number;
  createdAt: Date;
  updatedAt: Date;
  userReports?: UserReport[];
  // Populated when fetched via fetchModeratedReports
  target?: Entity | Comment | null;
  space?: Space | null;
}

export interface CreateReportResponse {
  message: string;
  code: "report/created" | "report/updated" | "report/already-reported";
}
