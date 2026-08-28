import { SublayConfig } from '../commands/init.js';

export function transformImports(content: string, config: SublayConfig): string {
  let transformed = content;

  // Transform registry 'files/' references to 'components/' in the installed structure
  // This handles imports like: import { Foo } from '../files/bar' → import { Foo } from '../components/bar'
  transformed = transformed.replace(/from(\s+)(['"])\.\.\/files\//g, 'from$1$2../components/');
  transformed = transformed.replace(/import(\s+)(['"])\.\.\/files\//g, 'import$1$2../components/');

  // Handle dynamic imports as well
  transformed = transformed.replace(/import\((['"])\.\.\/files\//g, 'import($1../components/');

  // Transform @/components alias if user has different setup
  // For now, keep imports as-is since they use relative paths
  // In the future, we can add more sophisticated transformations

  // Expo projects use @sublay/expo instead of @sublay/react-native
  if (config.platform === 'expo') {
    transformed = transformed.replace(
      /from\s+["']@sublay\/react-native["']/g,
      'from "@sublay/expo"'
    );
  }

  // Optionally transform based on user's alias configuration
  if (config.aliases['@/components']) {
    // Keep relative imports as-is for now
    // Future: transform to use user's aliases if they prefer
  }

  return transformed;
}

export function transformPaths(filePath: string, config: SublayConfig): string {
  // Transform file paths if needed
  // For now, just return as-is
  return filePath;
}
