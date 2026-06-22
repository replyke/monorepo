import { askContent, searchContent, searchSpaces, searchUsers } from "../src/modules/search";
import { makeClient } from "./helpers/mockClient";

describe("node-sdk search — request shaping", () => {
  it("searchContent posts the body minus space-reputation fields, which go in params instead", async () => {
    const { client, projectInstance } = makeClient();
    await searchContent(client, {
      query: "hello",
      sourceTypes: ["entity"],
      spaceReputationId: "rep1",
      spaceReputationDescendants: true,
    });
    expect(projectInstance.post).toHaveBeenCalledWith(
      "/search/content",
      { query: "hello", sourceTypes: ["entity"] },
      { params: { spaceReputationId: "rep1", spaceReputationDescendants: true } },
    );
  });

  it("searchUsers posts the full body to /search/users", async () => {
    const { client, projectInstance } = makeClient();
    await searchUsers(client, { query: "ali", limit: 5 });
    expect(projectInstance.post).toHaveBeenCalledWith("/search/users", {
      query: "ali",
      limit: 5,
    });
  });

  it("searchSpaces posts the full body to /search/spaces", async () => {
    const { client, projectInstance } = makeClient();
    await searchSpaces(client, { query: "design", limit: 5 });
    expect(projectInstance.post).toHaveBeenCalledWith("/search/spaces", {
      query: "design",
      limit: 5,
    });
  });

  it("askContent posts the body minus space-reputation fields, which go in params instead (plain request, no streaming)", async () => {
    const { client, projectInstance } = makeClient();
    await askContent(client, {
      query: "what is this space about?",
      spaceId: "s1",
      spaceReputationId: "rep1",
      spaceReputationDescendants: false,
    });
    expect(projectInstance.post).toHaveBeenCalledWith(
      "/search/ask",
      { query: "what is this space about?", spaceId: "s1" },
      { params: { spaceReputationId: "rep1", spaceReputationDescendants: false } },
    );
  });
});

describe("node-sdk search — response mapping", () => {
  it("searchContent returns the full PaginatedResponse envelope", async () => {
    const { client, projectInstance } = makeClient();
    const envelope = { data: [{ id: "e1" }], pagination: { page: 1, limit: 10, total: 1 } };
    projectInstance.post.mockResolvedValueOnce({ data: envelope });
    await expect(searchContent(client, { query: "hello" })).resolves.toEqual(envelope);
  });

  it("searchUsers returns the full PaginatedResponse envelope", async () => {
    const { client, projectInstance } = makeClient();
    const envelope = { data: [{ id: "u1" }], pagination: { page: 1, limit: 10, total: 1 } };
    projectInstance.post.mockResolvedValueOnce({ data: envelope });
    await expect(searchUsers(client, { query: "ali" })).resolves.toEqual(envelope);
  });

  it("searchSpaces returns the full PaginatedResponse envelope", async () => {
    const { client, projectInstance } = makeClient();
    const envelope = { data: [{ id: "s1" }], pagination: { page: 1, limit: 10, total: 1 } };
    projectInstance.post.mockResolvedValueOnce({ data: envelope });
    await expect(searchSpaces(client, { query: "design" })).resolves.toEqual(envelope);
  });

  it("askContent returns response.data as a plain { answer, sources } object", async () => {
    const { client, projectInstance } = makeClient();
    const result = { answer: "It's about design.", sources: [{ entityId: "e1", title: "Intro" }] };
    projectInstance.post.mockResolvedValueOnce({ data: result });
    await expect(
      askContent(client, { query: "what is this space about?" }),
    ).resolves.toEqual(result);
  });
});
