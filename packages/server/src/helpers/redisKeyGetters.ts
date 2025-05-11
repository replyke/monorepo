const getRedisProjectKey = (projectId: string): string => {
  const monthString = new Date().toISOString().slice(0, 7).replace("-", "");
  return `project:${projectId}:${monthString}`;
};

const getRedisProjectStatsKey = (projectId: string): string => {
  return `${getRedisProjectKey(projectId)}:stats`;
};

const getRedisProjectMauKey = (projectId: string): string => {
  return `${getRedisProjectKey(projectId)}:mau`;
};

const REDIS_TRACKING_KEY = {
  API_CALLS: "apiCalls",
  ENTITIES: "entities",
  COMMENTS: "comments",
  STORAGE: "storage",
};

export {
  getRedisProjectKey,
  getRedisProjectStatsKey,
  getRedisProjectMauKey,
  REDIS_TRACKING_KEY,
};
