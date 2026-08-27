import fs from 'fs-extra';
import path from 'path';

export async function detectProjectType(): Promise<'react' | 'react-native' | 'unknown'> {
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

    // Check for React Native
    if (deps['react-native'] || deps['expo']) {
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

      if (deps['typescript'] || deps['@types/react']) {
        return true;
      }
    }

    return false;
  } catch (error) {
    return false;
  }
}
