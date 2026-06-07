export { searchContent } from "./searchContent";
export { searchUsers } from "./searchUsers";
export { searchSpaces } from "./searchSpaces";
// NOTE: `askContent` is deferred — the server streams it over SSE, so it needs a
// streaming client (fetch + reader), not the blocking axios instance. Pending a
// decision on the public contract (callback vs async-generator). See plan §6.
