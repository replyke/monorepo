import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import prompts from 'prompts';
import { execa } from 'execa';

async function installDependencies(deps: string[]) {
  try {
    console.log(chalk.blue(`\n📦 Installing ${deps.join(', ')}...\n`));

    // Detect package manager
    const packageManager = await detectPackageManager();

    await execa(packageManager, ['install', ...deps], {
      stdio: 'inherit',
      cwd: process.cwd(),
    });

    console.log(chalk.green('\n✅ Dependencies installed successfully'));
  } catch (error) {
    console.error(chalk.red('\n❌ Failed to install dependencies'));
    console.error(error);
  }
}

async function detectPackageManager(): Promise<'npm' | 'yarn' | 'pnpm'> {
  const lockFiles = {
    'pnpm-lock.yaml': 'pnpm',
    'yarn.lock': 'yarn',
    'package-lock.json': 'npm',
  } as const;

  for (const [lockFile, pm] of Object.entries(lockFiles)) {
    if (await fs.pathExists(path.join(process.cwd(), lockFile))) {
      return pm;
    }
  }

  return 'npm'; // Default to npm
}

/**
 * Extract the bare package name from a registry dependency spec.
 * Handles scoped and unscoped packages, with or without a version suffix:
 *   "@sublay/react-js@^7.0.0" -> "@sublay/react-js"
 *   "@sublay/react-js"        -> "@sublay/react-js"
 *   "lucide-react@^1.0.0"     -> "lucide-react"
 *   "lucide-react"            -> "lucide-react"
 */
export function parseDependencyName(dep: string): string {
  const parts = dep.split('@').filter(Boolean);

  // Scoped package: @scope/name[@version] — the leading '@' is stripped by the
  // filter above, so put it back on the first remaining segment.
  if (dep.startsWith('@')) {
    return `@${parts[0]}`;
  }

  // Regular package: name[@version]
  return parts[0];
}

/**
 * Check and optionally install component-specific dependencies
 * @param dependencies Array of dependencies in format "package@version"
 */
export async function checkComponentDependencies(dependencies: string[]) {
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');

    if (!(await fs.pathExists(packageJsonPath))) {
      console.log(chalk.yellow('\n⚠️  No package.json found'));
      return;
    }

    const packageJson = await fs.readJson(packageJsonPath);
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    // Parse dependencies (format: "package@version" -> extract package name)
    const requiredDeps = dependencies.map(parseDependencyName);

    const missingDeps = requiredDeps.filter((dep) => !allDeps[dep]);

    if (missingDeps.length === 0) {
      console.log(chalk.green('\n✅ All required dependencies are installed'));
      return;
    }

    console.log(chalk.yellow('\n⚠️  Missing required dependencies:'));

    // Show dependencies with their versions
    const missingDepsWithVersions = dependencies.filter((dep) =>
      missingDeps.includes(parseDependencyName(dep))
    );

    missingDepsWithVersions.forEach((dep) => console.log(chalk.dim(`  - ${dep}`)));

    // Without a TTY (scripts, CI, agents) there is nobody to answer the prompt.
    // Skip it and take the same branch as an explicit "no" so we never block.
    let install = false;
    if (process.stdin.isTTY) {
      const answer = await prompts({
        type: 'confirm',
        name: 'install',
        message: 'Would you like to install them now?',
        initial: true,
      });
      install = Boolean(answer.install);
    }

    if (install) {
      await installDependencies(missingDepsWithVersions);
    } else {
      console.log(chalk.dim('\nYou can install them later with:'));
      const packageManager = await detectPackageManager();
      const installCmd = packageManager === 'npm' ? 'npm install' : packageManager === 'yarn' ? 'yarn add' : 'pnpm add';
      console.log(chalk.dim(`  ${installCmd} ${missingDepsWithVersions.join(' ')}\n`));
    }
  } catch (error) {
    console.error(chalk.red('\n❌ Error checking dependencies:'), error);
  }
}
