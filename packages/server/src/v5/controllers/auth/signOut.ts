import { Request as ExReq, Response as ExRes } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

import { Token } from "../../../models";
import IToken from "../../../interfaces/IToken";
import { getCoreConfig } from "../../../config";

export default async (req: ExReq, res: ExRes) => {
  const { refreshToken } = req.body;
  const cookies = req.cookies;
  const cookieJwt = cookies?.["replyke-refresh-jwt"];
  const { refreshTokenSecret } = getCoreConfig();

  try {
    if (cookieJwt) {
      // Clear the HttpOnly cookie on the client
      res.clearCookie("replyke-refresh-jwt", {
        httpOnly: true,
        sameSite: "none",
        secure: process.env.NODE_ENV === "production",
      });
    }
    const refreshTokenJWT = cookieJwt || refreshToken;

    if (!refreshTokenJWT) {
      res.sendStatus(204); // No content, no refresh token to clear
      return;
    }

    try {
      // Decode and verify the refresh token JWT
      const decoded = jwt.verify(
        refreshTokenJWT,
        refreshTokenSecret
      ) as JwtPayload;

      const { jti } = decoded;

      // Find the refresh token in the Token table using Sequelize
      const token = (await Token.findOne({
        where: { id: jti },
      })) as IToken | null;

      if (token) {
        // Delete the token from the database
        await token.destroy();
      }
    } catch (tokenError) {
      // Log but do not expose details
      console.error("Error handling refresh token during signout:", tokenError);
      // Invalid token, but we still return 204 to avoid leaking details
      res.sendStatus(204);
      return;
    }

    // Return 204 No Content even if the token is not found, to avoid revealing details
    res.sendStatus(204);
  } catch (err: any) {
    console.error("Error signing user out:", err);
    res.status(500).json({
      error: "Internal server error.",
      code: "auth/server-error",
      details: err.message,
    });
  }
};
