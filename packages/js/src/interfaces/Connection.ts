import { User } from "./User";

export interface Connection {
  id: string;
  message?: string;
  createdAt: string;
}

export interface EstablishedConnection {
  id: string;
  connectedUser: User;
  connectedAt: string;
}

export interface PendingConnection extends Connection {
  user: User;
  type: "received" | "sent";
}

export interface ConnectionRequestParams {
  userId: string;
  message?: string;
}

export interface ConnectionActionResponse {
  id: string;
  status: string;
  createdAt?: string;
  respondedAt?: string;
}

export interface ConnectionWithdrawResponse {
  message: string;
}

export interface ConnectionCountResponse {
  count: number;
}

export interface RemoveConnectionByUserIdResponse {
  id?: string;
  status?: string;
  respondedAt?: string;
  message?: string;
  action?: "withdraw" | "disconnect" | "decline";
}

export interface ConnectionStatusNone {
  status: "none";
}

export interface ConnectionStatusPending {
  status: "pending";
  type: "sent" | "received";
  connectionId: string;
  createdAt: string;
}

export interface ConnectionStatusConnected {
  status: "connected";
  connectionId: string;
  connectedAt: string;
  requestedAt: string;
}

export interface ConnectionStatusDeclined {
  status: "declined";
  type: "sent" | "received";
  connectionId: string;
  respondedAt: string;
}

export type ConnectionStatusResponse =
  | ConnectionStatusNone
  | ConnectionStatusPending
  | ConnectionStatusConnected
  | ConnectionStatusDeclined;

export type ConnectionStatus =
  | "none"
  | "pending-sent"
  | "pending-received"
  | "connected"
  | "declined-sent"
  | "declined-received";
