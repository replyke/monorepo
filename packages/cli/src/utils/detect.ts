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
