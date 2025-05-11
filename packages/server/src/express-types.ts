// In src/typesSetup.ts
import IProject from "./interfaces/IProject";

declare global {
  namespace Express {
    interface Request {
      userId: string;
      project: IProject;
      userRole: "admin" | "editor" | "visitor";
      isMaster: boolean;
    }
  }
}
export {};
