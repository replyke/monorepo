import { describe, it, expect } from "vitest";

import { parseDependencyName } from "./dependencies";

describe("parseDependencyName", () => {
  it("keeps the scope on a scoped package with a version", () => {
    expect(parseDependencyName("@sublay/react-js@^7.0.0")).toBe(
      "@sublay/react-js"
    );
  });

  it("keeps the scope on a scoped package with no version", () => {
    expect(parseDependencyName("@sublay/react-js")).toBe("@sublay/react-js");
  });

  it("strips the version from an unscoped package", () => {
    expect(parseDependencyName("lucide-react@^1.0.0")).toBe("lucide-react");
  });

  it("passes an unscoped package with no version through", () => {
    expect(parseDependencyName("lucide-react")).toBe("lucide-react");
  });
});
