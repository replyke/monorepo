import { Request as ExReq, Response as ExRes } from "express";
import { User } from "../../../models";
import IUser from "../../../interfaces/IUser";
import deepEqual from "../../../utils/deepEqual";

function getQueryString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  return undefined;
}

function getQueryJSON<T>(value: unknown): T | undefined {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export default async (req: ExReq, res: ExRes) => {
  try {
    const foreignId = getQueryString(req.query.foreignId);
    const name = getQueryString(req.query.name);
    const username = getQueryString(req.query.username);
    const avatar = getQueryString(req.query.avatar);
    const bio = getQueryString(req.query.bio);
    // const birthdateRaw = getQueryString(req.query.birthdate);
    // const locationRaw = getQueryString(req.query.location);
    const metadata = getQueryJSON<Record<string, any>>(req.query.metadata);
    const secureMetadata = getQueryJSON<Record<string, any>>(
      req.query.secureMetadata
    );

    if (!foreignId || typeof foreignId !== "string") {
      res.status(400).json({
        error: "Missing or invalid foreign user ID.",
        code: "user/invalid-identifier",
      });
      return;
    }

    const projectId = req.project.id;
    let user = (await User.findOne({
      where: { foreignId, projectId },
    })) as IUser | null;

    let created = false;
    let updated = false;

    if (!user) {
      // Create a new user
      user = (await User.create({
        projectId,
        foreignId,
        name,
        username,
        avatar,
        bio,
        // location,
        // birthdate,
        metadata,
        secureMetadata,
      })) as IUser;
      created = true;
    } else {
      // Check for field updates
      const fieldsToUpdate: Partial<IUser> = {};
      if (name && user.name !== name) fieldsToUpdate.name = name;
      if (username && user.username !== username)
        fieldsToUpdate.username = username;
      if (avatar && user.avatar !== avatar) fieldsToUpdate.avatar = avatar;
      if (bio && user.bio !== bio) fieldsToUpdate.bio = bio;
      // if (location && user.location !== location)
      //   fieldsToUpdate.location = location;
      // if (birthdate && user.birthdate !== birthdate)
      //   fieldsToUpdate.birthdate = birthdate;
      if (!deepEqual(user.metadata, metadata ?? {}))
        fieldsToUpdate.metadata = metadata || {};
      if (!deepEqual(user.secureMetadata, secureMetadata ?? {}))
        fieldsToUpdate.secureMetadata = secureMetadata || {};

      if (Object.keys(fieldsToUpdate).length > 0) {
        await user.update(fieldsToUpdate);
        updated = true;
      }
    }

    // Fetch user again without sensitive fields
    const cleanUser = await User.findByPk(user.id, {
      attributes: {
        exclude: [
          "hash",
          "salt",
          "email",
          "isVerified",
          "isActive",
          "lastActive",
          "secureMetadata",
        ],
      },
    });

    res.status(created ? 201 : 200).json({
      user: cleanUser?.toJSON(),
      created,
      updated,
    });
  } catch (err: any) {
    console.error("Error fetching/creating/updating user:", err);
    res.status(500).json({
      error: "Internal server error",
      code: "user/server-error",
      details: err.message,
    });
  }
};
