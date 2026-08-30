import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // `node`, not jsdom: the only suite here covers a pure function that
    // returns a React element tree, which is asserted on directly rather
    // than rendered. Add jsdom (and the react plugin) if that ever changes.
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
