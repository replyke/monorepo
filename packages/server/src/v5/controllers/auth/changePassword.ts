import { Request as ExReq, Response as ExRes } from "express";

import {
  generateSaltAndHash,
  verifyPassword,
} from "../../../helpers/authentication";
import { User } from "../../../models";
import IUser from "../../../interfaces/IUser";

export default async (req: ExReq, res: ExRes) => {
  const { password, newPassword } = req.body;
  const loggedInUserId = req.userId;

  if (!password || !newPassword) {
    res.status(400).json({
      error: "Email, password, and a new password are all required.",
      code: "auth/missing-fields",
    });
    return;
  }

  try {
    // Find user by email using Sequelize
    const user = (await User.findByPk(loggedInUserId)) as IUser | null;

    if (!user) {
      res.status(403).json({
        error: "User not found.",
        code: "auth/no-user-found",
      });
      return;
    }

    if (!user.hash || !user.salt) {
      res.status(400).json({
        error: "User is not authenticated with email and password.",
        code: "auth/not-password-authenticated",
      });
      return;
    }

    // Validate password
    const isValid = verifyPassword(password, user.hash, user.salt);

    if (!isValid) {
      res.status(401).json({
        error: "Incorrect password.",
        code: "auth/wrong-password",
      });
      return;
    }

    // Generate salt and hash for the new password
    const { salt, hash } = generateSaltAndHash(newPassword);

    user.salt = salt;
    user.hash = hash;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Password updated successfully.",
    });
  } catch (err: any) {
    console.error("Error updating client password:", err);
    res.status(500).json({
      error: "Internal server error.",
      code: "auth/server-error",
      details: err.message,
    });
  }
};
