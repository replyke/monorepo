import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      // react-native ships Flow-typed source Vite cannot parse. Nothing under
      // test needs its runtime, only its exported component identities.
      "react-native": path.resolve(dirname, "test/react-native-stub.ts"),
    },
  },
  test: {
    // `node`: the only suite here covers a pure function that returns a React
    // element tree, which is asserted on directly rather than rendered.
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
