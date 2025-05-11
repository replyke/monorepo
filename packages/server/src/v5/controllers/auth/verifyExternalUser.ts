import { Request as ExReq, Response as ExRes } from "express";
import jwt from "jsonwebtoken";
import { User } from "../../../models";
import { Token } from "../../../models";
import IUser from "../../../interfaces/IUser";
import IToken from "../../../interfaces/IToken";
import validateUserCreated from "../../../helpers/webhooks/validateUserCreated";
import deepEqual from "../../../utils/deepEqual";
import reduceAuthenticatedUserDetails from "../../../helpers/reduceAuthenticatedUserDetails";
import { getCoreConfig } from "../../../config";
import { Model, ModelStatic } from "sequelize";
import { ISuspension } from "../../../interfaces/ISuspension";

export default async (req: ExReq, res: ExRes) => {
  const { userJwt } = req.body;
  const projectId = req.project.id!;

  if (!userJwt) {
    res
      .status(400)
      .json({ error: "Missing userJwt", code: "auth/missing-jwt" });
    return;
  }

  try {
    const jwtKeys = req.project.keys.jwt;

    if (!jwtKeys || !jwtKeys.publicKey) {
      res
        .status(403)
        .json({ error: "Missing JWT keys", code: "auth/missing-keys" });
      return;
    }

    const publicKeyPem = Buffer.from(jwtKeys.publicKey, "base64").toString(
      "utf-8"
    );

    const previousKeyPem = jwtKeys.previousPublicKey
      ? Buffer.from(jwtKeys.previousPublicKey, "base64").toString("utf-8")
      : null;

    let decoded;

    try {
      // Try verifying with the current public key
      decoded = jwt.verify(userJwt, publicKeyPem, { algorithms: ["RS256"] });
    } catch (err) {
      if (!previousKeyPem) {
        res
          .status(403)
          .json({ error: "Invalid token", code: "auth/invalid-token" });
        return;
      }
      try {
        // Fallback to the previous public key if available
        decoded = jwt.verify(userJwt, previousKeyPem, {
          algorithms: ["RS256"],
        });
      } catch {
        res
          .status(403)
          .json({ error: "Invalid token", code: "auth/invalid-token" });
        return;
      }
    }
    // `decoded` should now be the payload the external project signed
    const {
      sub: externalUserId,
      iss: providedProjectId,
      userData,
    } = decoded as jwt.JwtPayload;

    if (projectId !== providedProjectId) {
      res
        .status(403)
        .json({ error: "Project ID mismatch", code: "auth/project-mismatch" });
      return;
    }

    const {
      email,
      name,
      username,
      avatar,
      bio,
      location,
      birthdate,
      metadata,
      secureMetadata,
    } = userData;

    const { sequelize, refreshTokenSecret } = getCoreConfig();

    const { user, refreshTokenJWT } = await sequelize.transaction(
      async (transaction) => {
        // Try to find an existing user by projectId + foreignId
        let user = (await User.findOne({
          where: { projectId, foreignId: String(externalUserId) },
          transaction,
        })) as IUser | null;

        if (user) {
          // Update only if there's a change
          let shouldUpdate = false;
          if (email && user.email !== email) {
            user.email = email;
            shouldUpdate = true;
          }

          if (user.name !== name) {
            user.name = name;
            shouldUpdate = true;
          }

          if (user.username !== username) {
            user.username = username;
            shouldUpdate = true;
          }
          if (user.avatar !== avatar) {
            user.avatar = avatar;
            shouldUpdate = true;
          }

          if (user.bio !== bio) {
            user.bio = bio;
            shouldUpdate = true;
          }

          if (user.location !== location) {
            user.location = location;
            shouldUpdate = true;
          }

          if (user.birthdate !== birthdate) {
            user.birthdate = birthdate;
            shouldUpdate = true;
          }

          if (!deepEqual(user.metadata, metadata ?? {})) {
            user.metadata = metadata || {};
            shouldUpdate = true;
          }

          if (!deepEqual(user.secureMetadata, secureMetadata ?? {})) {
            user.metadata = metadata || {};
            shouldUpdate = true;
          }

          if (shouldUpdate) {
            await user.save({ transaction });
          }
        } else {
          if (email) {
            // Try to find an existing user by projectId + email
            user = (await User.findOne({
              where: { projectId, email },
              transaction,
            })) as IUser | null;
          }

          if (user) {
            if (email && user.email !== email) {
              user.email = email;
            }

            if (user.name !== name) {
              user.name = name;
            }

            if (user.username !== username) {
              user.username = username;
            }
            if (user.avatar !== avatar) {
              user.avatar = avatar;
            }

            if (user.bio !== bio) {
              user.bio = bio;
            }

            if (user.location !== location) {
              user.location = location;
            }

            if (user.birthdate !== birthdate) {
              user.birthdate = birthdate;
            }

            if (!deepEqual(user.metadata, metadata ?? {})) {
              user.metadata = metadata;
            }

            if (!deepEqual(user.secureMetadata, secureMetadata ?? {})) {
              user.metadata = metadata;
            }

            if (externalUserId) {
              user.referenceId = externalUserId;
              user.foreignId = externalUserId;
            }
            await user.save({ transaction });
          } else {
            const newUserData: Partial<IUser> & { projectId: string } = {
              projectId,
              referenceId: String(externalUserId),
              foreignId: String(externalUserId),
              role: "visitor",
              email,
              name,
              username,
              avatar,
              bio,
              location,
              birthdate,
              metadata,
              secureMetadata,
            };

            const { projectId: _, ...restOfUserData } = newUserData;

            // Call the webhook to validate the user creation
            await validateUserCreated(req, res, {
              projectId,
              data: restOfUserData,
            });

            // Create a new user if it doesn't exist
            user = (await User.create(newUserData, { transaction })) as IUser;
          }
        }

        // Create a new Token entry
        const TokenEntry = (await Token.create(
          {
            userId: user.id,
            projectId,
          },
          { transaction }
        )) as IToken;

        // Generate the JWT for the refresh token
        const refreshTokenJWT = jwt.sign(
          {
            sub: user.id,
            projectId,
            aud: "replyke.com",
            iss: "replyke.com",
            jti: TokenEntry.id,
          },
          refreshTokenSecret,
          { expiresIn: "30d" }
        );

        // Update the Token with the generated JWT
        TokenEntry.refreshToken = refreshTokenJWT;
        await TokenEntry.save({ transaction });

        return { user, refreshTokenJWT };
      }
    );

    const SuspensionModel = (User.associations.suspensions as any)
      .target as ModelStatic<Model<any, any>>;
    const ActiveSuspensionModel = SuspensionModel.scope({
      method: ["active", new Date()],
    });

    // 2) Re-fetch the user, this time including only active suspensions:
    const userWithSuspensions = (await User.findByPk(user.id, {
      include: [
        {
          model: ActiveSuspensionModel,
          as: "suspensions",
          required: false,
        },
      ],
    })) as (IUser & { suspensions: ISuspension[] }) | null;

    if (!userWithSuspensions) {
      res.status(500).json({
        error: "Unexpected error fetching user after login",
        code: "auth/missing-user",
      });
      return;
    }

    // Generate the JWT for the access token
    const accessTokenJWT = jwt.sign(
      {
        sub: user.id, // Subject, representing the user ID
        projectId, // Project ID, indicating which project this token is tied to
        role: "user", // User role
        aud: "replyke.com", // Audience, your authentication service
        iss: "replyke.com", // Issuer, your service
      },
      process.env.ACCESS_TOKEN_SECRET!,
      { expiresIn: "30m" } // Access token expiry
    );

    res.cookie("replyke-refresh-jwt", refreshTokenJWT, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    const reducedAuthenticatedUser =
      reduceAuthenticatedUserDetails(userWithSuspensions);

    res.status(200).json({
      success: true,
      accessToken: accessTokenJWT,
      refreshToken: refreshTokenJWT,
      user: reducedAuthenticatedUser,
    });
  } catch (err: any) {
    console.error("Verification failed:", err);
    res.status(500).json({
      error: "Internal server error",
      code: "auth/server-error",
      details: err.message,
    });
  }
};
