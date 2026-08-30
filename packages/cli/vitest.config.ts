import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // A CLI: no DOM, unlike the react-family packages' jsdom configs.
    environment: "node",
    include: ["src/**/*.test.ts"],
    // `forks`, not the default `threads`: detect.test.ts uses process.chdir()
    // to point detectProjectType()/detectTypeScript() at fixture directories,
    // and process.chdir does not exist inside a worker thread.
    pool: "forks",
    // cli-integration.test.ts spawns the built binary; give it room without
    // being so generous that a reintroduced TTY hang would look like a pass.
    testTimeout: 20000,
  },
});
