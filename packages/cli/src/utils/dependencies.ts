import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import prompts from 'prompts';
import { execa } from 'execa';

const REQUIRED_DEPS = {
  react: ['@replyke/react-js', '@replyke/ui-core-react-js'],
  'react-native': ['@replyke/react-native', '@replyke/ui-core-react-native'],
  expo: ['@replyke/expo', '@replyke/ui-core-react-native'],
};

export async function checkDependencies(platform: 'react' | 'react-native' | 'expo') {
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

    const requiredDeps = REQUIRED_DEPS[platform];
    const missingDeps = requiredDeps.filter((dep) => !allDeps[dep]);

    if (missingDeps.length === 0) {
      console.log(chalk.green('\n✅ All required dependencies are installed'));
      return;
    }

    console.log(chalk.yellow('\n⚠️  Missing required dependencies:'));
    missingDeps.forEach((dep) => console.log(chalk.dim(`  - ${dep}`)));

    const { install } = await prompts({
      type: 'confirm',
      name: 'install',
      message: 'Would you like to install them now?',
      initial: true,
    });

    if (install) {
      await installDependencies(missingDeps);
    } else {
      console.log(chalk.dim('\nYou can install them later with:'));
      console.log(chalk.dim(`  npm install ${missingDeps.join(' ')}\n`));
    }
  } catch (error) {
    console.error(chalk.red('\n❌ Error checking dependencies:'), error);
  }
}

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
    const requiredDeps = dependencies.map((dep) => {
      // Handle scoped packages like @replyke/react-js@^6.0.0
      const parts = dep.split('@').filter(Boolean);
      if (dep.startsWith('@')) {
        // Scoped package: @scope/name@version
        return `@${parts[0]}`;
      } else {
        // Regular package: name@version
        return parts[0];
      }
    });

    const missingDeps = requiredDeps.filter((dep) => !allDeps[dep]);

    if (missingDeps.length === 0) {
      console.log(chalk.green('\n✅ All required dependencies are installed'));
      return;
    }

    console.log(chalk.yellow('\n⚠️  Missing required dependencies:'));

    // Show dependencies with their versions
    const missingDepsWithVersions = dependencies.filter((dep) => {
      const parts = dep.split('@').filter(Boolean);
      const pkgName = dep.startsWith('@') ? `@${parts[0]}` : parts[0];
      return missingDeps.includes(pkgName);
    });

    missingDepsWithVersions.forEach((dep) => console.log(chalk.dim(`  - ${dep}`)));

    const { install } = await prompts({
      type: 'confirm',
      name: 'install',
      message: 'Would you like to install them now?',
      initial: true,
    });

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
