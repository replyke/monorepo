import fs from 'fs-extra';
import path from 'path';

export async function detectProjectType(): Promise<'react' | 'react-native' | 'expo' | 'unknown'> {
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');

    if (!(await fs.pathExists(packageJsonPath))) {
      return 'unknown';
    }

    const packageJson = await fs.readJson(packageJsonPath);
    const deps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    // Check for Expo first — an Expo app also declares react-native,
    // so this branch must come before the generic React Native check.
    if (deps['expo']) {
      return 'expo';
    }

    // Check for React Native
    if (deps['react-native']) {
      return 'react-native';
    }

    // Check for React
    if (deps['react']) {
      return 'react';
    }

    return 'unknown';
  } catch (error) {
    return 'unknown';
  }
}

export async function detectTypeScript(): Promise<boolean> {
  try {
    // Check for tsconfig.json
    const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
    if (await fs.pathExists(tsconfigPath)) {
      return true;
    }

    // Check for typescript in package.json dependencies
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (await fs.pathExists(packageJsonPath)) {
      const packageJson = await fs.readJson(packageJsonPath);
      const deps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      // Only the `typescript` package itself counts (alongside the
      // tsconfig.json check above). `@types/react` is deliberately NOT a
      // signal: plain-JS React projects commonly keep it around purely for
      // editor IntelliSense, and treating it as proof of TypeScript makes
      // `add` install unstripped .ts/.tsx into a project with no compiler.
      if (deps['typescript']) {
        return true;
      }
    }

    return false;
  } catch (error) {
    return false;
  }
}
