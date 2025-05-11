import { Request as ExReq, Response as ExRes, NextFunction } from "express";
import jwt, { JwtPayload, VerifyErrors } from "jsonwebtoken";
import { getCoreConfig } from "../config";

// Unlike "requireUserAuth", this function would still allow the request to pass through
export default (req: ExReq, _: ExRes, next: NextFunction) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    next();
    return;
  }

  const token = authHeader.split(" ")[1];
  const { accessTokenSecret } = getCoreConfig();

  jwt.verify(
    token,
    accessTokenSecret,
    (
      err: VerifyErrors | null, // Type for error from jwt.verify
      decoded: JwtPayload | string | undefined
    ) => {
      if (err || !decoded || typeof decoded === "string" || !decoded.sub) {
        next();
        return;
      }

      req.userId = decoded.sub;
      next();
    }
  );
};
