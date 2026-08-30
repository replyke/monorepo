import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs-extra";
import os from "os";
import path from "path";

import { detectProjectType, detectTypeScript } from "./detect";

// Both functions read process.cwd(), so the fixtures are real directories we
// chdir into. That is why vitest.config.ts sets `pool: "forks"` — process.chdir
// is undefined inside a worker thread.
const originalCwd = process.cwd();
let fixtureDir: string;

beforeEach(async () => {
  fixtureDir = await fs.mkdtemp(path.join(os.tmpdir(), "sublay-cli-detect-"));
  process.chdir(fixtureDir);
});

afterEach(async () => {
  process.chdir(originalCwd);
  await fs.remove(fixtureDir);
});

async function writePackageJson(pkg: Record<string, unknown>): Promise<void> {
  await fs.writeJson(path.join(fixtureDir, "package.json"), {
    name: "fixture",
    ...pkg,
  });
}

describe("detectProjectType", () => {
  it("detects expo when expo, react and react-native are all present", async () => {
    await writePackageJson({
      dependencies: {
        expo: "^54.0.0",
        react: "^19.0.0",
        "react-native": "0.81.0",
      },
    });

    await expect(detectProjectType()).resolves.toBe("expo");
  });

  it("detects react-native when there is no expo", async () => {
    await writePackageJson({
      dependencies: { react: "^19.0.0", "react-native": "0.81.0" },
    });

    await expect(detectProjectType()).resolves.toBe("react-native");
  });

  it("detects react for a web project", async () => {
    await writePackageJson({
      dependencies: { react: "^19.0.0", "react-dom": "^19.0.0" },
    });

    await expect(detectProjectType()).resolves.toBe("react");
  });

  it("returns unknown when no react family package is present", async () => {
    await writePackageJson({ dependencies: { lodash: "^4.17.21" } });

    await expect(detectProjectType()).resolves.toBe("unknown");
  });
});

describe("detectTypeScript", () => {
  it("returns true when the typescript package is a devDependency", async () => {
    await writePackageJson({
      dependencies: { react: "^19.0.0" },
      devDependencies: { typescript: "^5.7.0" },
    });

    await expect(detectTypeScript()).resolves.toBe(true);
  });

  it("returns true when a tsconfig.json exists without a typescript dep", async () => {
    await writePackageJson({ dependencies: { react: "^19.0.0" } });
    await fs.writeJson(path.join(fixtureDir, "tsconfig.json"), {});

    await expect(detectTypeScript()).resolves.toBe(true);
  });

  it("returns false for a plain-JS project that keeps @types/react for IntelliSense", async () => {
    // The whole reason this file exists. @types/react alone used to flip this
    // to true, so `init` wrote "typescript": true and `add` installed raw
    // .ts/.tsx into a project with no compiler to strip them — while printing
    // full success.
    await writePackageJson({
      dependencies: { react: "^19.0.0", "react-dom": "^19.0.0" },
      devDependencies: { "@types/react": "^19.0.0" },
    });

    await expect(detectTypeScript()).resolves.toBe(false);
  });

  it("returns false when there is neither a typescript dep nor a tsconfig", async () => {
    await writePackageJson({ dependencies: { react: "^19.0.0" } });

    await expect(detectTypeScript()).resolves.toBe(false);
  });
});
