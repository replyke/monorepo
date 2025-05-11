import { Request as ExReq, Response as ExRes } from "express";
import jwt from "jsonwebtoken";

export default async (req: ExReq, res: ExRes) => {
  try {
    const { projectId, privateKey, payload } = req.body;

    if (!projectId || !privateKey || !payload) {
      res.status(400).send("Missing params in request body");
      return;
    }

    const { id } = payload;

    if (!id) {
      res.status(400).json({
        error: "Missing user id in payload.",
        code: "crypto/missing-params",
      });
      return;
    }

    const privateKeyPem = Buffer.from(privateKey, "base64").toString("utf-8");

    const token = jwt.sign(
      {
        sub: id,
        iss: projectId,
        aud: "replyke.com",
        userData: payload,
      },
      privateKeyPem,
      {
        algorithm: "RS256",
        expiresIn: "5m",
      }
    );

    // Return the article with a 200 (OK) status.
    res.status(200).send(token);
  } catch (err: any) {
    console.error("Error signing test jwt: ", err);
    res.status(500).json({
      error: "Internal server error",
      code: "crypto/server-error",
      details: err.message,
    });
  }
};
