import {
  Request as ExReq,
  Response as ExRes,
  NextFunction,
  RequestHandler,
} from "express";
import jwt, { JwtPayload, VerifyErrors } from "jsonwebtoken";
import { getCoreConfig } from "../config";

const requireUserAuth: RequestHandler = (
  req: ExReq,
  res: ExRes,
  next: NextFunction
) => {
  if (req.isMaster) {
    next();
    return;
  }

  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    res.sendStatus(401);
    return;
  }

  const token = authHeader.split(" ")[1];
  const { accessTokenSecret } = getCoreConfig();

  jwt.verify(
    token,
    accessTokenSecret,
    (err: VerifyErrors | null, decoded: JwtPayload | string | undefined) => {
      if (err || !decoded || typeof decoded === "string" || !decoded.sub) {
        console.warn("Unauthorized request");
        res.sendStatus(403);
        return;
      }

      req.userId = decoded.sub;
      next();
    }
  );
};

export default requireUserAuth;
