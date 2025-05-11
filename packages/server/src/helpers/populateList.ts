import IList from "../interfaces/IList";
import { Entity } from "../models";

export default async function populateList(list: IList) {
  // If a list is found, retrieve the entities using the entityIds array
  const entityIds = list.entityIds as string[]; // Assuming entityIds is an array of strings

  const entities = await Entity.findAll({
    where: {
      id: entityIds, // Fetch entities where id is in the entityIds array
    },
  });

  const leanList = list.toJSON();

  return {
    ...leanList,
    parentId: leanList.parentId === leanList.userId ? null : leanList.parentId,
    entities,
  };
}
