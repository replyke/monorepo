import { Transaction } from "sequelize";
import { User } from "../models";
import { getCoreConfig } from "../config";

export default async function updateUserReputation(
  userId: string,
  change: number,
  transaction?: Transaction
) {
  const { sequelize } = getCoreConfig();
  await User.update(
    { reputation: sequelize.literal(`"reputation" + ${change}`) },
    { where: { id: userId }, transaction }
  );
}
