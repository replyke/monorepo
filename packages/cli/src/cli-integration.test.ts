import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import { spawn } from "node:child_process";
import fs from "fs-extra";
import os from "os";
import path from "path";
import { fileURLToPath } from "node:url";

// These drive the real compiled binary, because the behaviours they guard are
// process-level (stdin/TTY handling, exit codes) and cannot be observed by
// importing the modules directly.
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliEntry = path.join(packageRoot, "dist", "index.js");
const packageVersion: string = fs.readJsonSync(
  path.join(packageRoot, "package.json")
).version;

beforeAll(() => {
  // The `test` script builds first, so a missing dist means something went
  // wrong upstream. Fail loudly rather than skipping — a silently skipped
  // suite is exactly the "no coverage" state these tests exist to end.
  if (!fs.existsSync(cliEntry)) {
    throw new Error(
      `${cliEntry} not found. Run \`pnpm --filter @sublay/cli run build\` first.`
    );
  }
});

interface RunResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

/**
 * Run the built CLI with stdin closed — i.e. no TTY and nothing to read — which
 * is how it runs under scripts, CI and agents.
 */
function runCli(args: string[], cwd: string): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cliEntry, ...args], {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => (stdout += chunk.toString()));
    child.stderr.on("data", (chunk) => (stderr += chunk.toString()));
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

let workDir: string;

beforeEach(async () => {
  workDir = await fs.mkdtemp(path.join(os.tmpdir(), "sublay-cli-e2e-"));
});

afterEach(async () => {
  await fs.remove(workDir);
});

describe("sublay add", () => {
  it("finishes instead of hanging when dependencies are missing and there is no TTY", async () => {
    await fs.writeJson(path.join(workDir, "package.json"), {
      name: "consumer",
      dependencies: { react: "^19.0.0", "react-dom": "^19.0.0" },
    });
    await fs.writeJson(path.join(workDir, "sublay.json"), {
      platform: "react",
      style: "styled",
      typescript: true,
      paths: { components: "src/components" },
      aliases: { "@/components": "./src/components" },
    });

    // comments-social declares @sublay/react-js and @sublay/ui-core-react-js,
    // neither of which the fixture package.json has — so this hits the
    // "missing dependencies" branch that used to sit on an unanswerable prompt.
    const result = await runCli(["add", "comments-social"], workDir);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("install them later");
    expect(
      await fs.pathExists(
        path.join(workDir, "src", "components", "comments-social")
      )
    ).toBe(true);
    // The 15s cap is the vitest testTimeout in vitest.config.ts: an
    // unanswerable prompt would block forever and fail there.
  }, 15000);

  // sublay.json is a plain file on disk — hand-edited, half-written by
  // non-interactive scaffolding, or copied between projects. Each of these used
  // to escape as a raw stack trace (`TypeError: Cannot read properties of
  // undefined`, `SyntaxError: ... in JSON`) rather than actionable guidance.
  const malformedConfigs: Array<{ label: string; contents: string }> = [
    {
      label: "missing aliases",
      contents: JSON.stringify({
        platform: "react",
        style: "styled",
        typescript: true,
        paths: { components: "src/components" },
      }),
    },
    {
      label: "missing paths",
      contents: JSON.stringify({
        platform: "react",
        style: "styled",
        typescript: true,
        aliases: { "@/components": "./src/components" },
      }),
    },
    {
      label: "invalid JSON",
      // A trailing comma — valid to a human, fatal to JSON.parse.
      contents:
        '{"platform":"react","style":"styled","typescript":true,' +
        '"paths":{"components":"src/components"},' +
        '"aliases":{"@/components":"./src/components"},}',
    },
  ];

  for (const { label, contents } of malformedConfigs) {
    it(`exits cleanly with actionable guidance when sublay.json has ${label}`, async () => {
      await fs.writeJson(path.join(workDir, "package.json"), {
        name: "consumer",
        dependencies: { react: "^19.0.0", "react-dom": "^19.0.0" },
      });
      await fs.writeFile(path.join(workDir, "sublay.json"), contents, "utf-8");

      const result = await runCli(["add", "comments-social"], workDir);
      const output = result.stdout + result.stderr;

      expect(result.code).toBe(1);
      expect(output).toContain("sublay.json is missing or malformed");
      expect(output).toContain("npx @sublay/cli init");
      // No internal exception should reach the user.
      expect(output).not.toMatch(/TypeError|SyntaxError|\bat .*\.js:\d+/);
      // And nothing should have been written to the project.
      expect(await fs.pathExists(path.join(workDir, "src"))).toBe(false);
    }, 15000);
  }
});

describe("sublay init", () => {
  it("refuses to run without a TTY instead of writing a silent config", async () => {
    const result = await runCli(["init"], workDir);
    const output = result.stdout + result.stderr;

    expect(result.code).toBe(1);
    expect(output).toMatch(/TTY|interactive terminal/);
    expect(await fs.pathExists(path.join(workDir, "sublay.json"))).toBe(false);
  }, 15000);
});

describe("sublay --version", () => {
  it("prints the version from package.json", async () => {
    const result = await runCli(["--version"], workDir);

    expect(result.code).toBe(0);
    expect(result.stdout.trim()).toBe(packageVersion);
  }, 15000);
});
