import { ReplykeConfig } from '../commands/init.js';

export function transformImports(content: string, config: ReplykeConfig): string {
  let transformed = content;

  // Transform registry 'files/' references to 'components/' in the installed structure
  // This handles imports like: import { Foo } from '../files/bar' → import { Foo } from '../components/bar'
  transformed = transformed.replace(/from\s+['"]\.\.\/files\//g, 'from "../components/');
  transformed = transformed.replace(/import\s+['"]\.\.\/files\//g, 'import "../components/');

  // Handle dynamic imports as well
  transformed = transformed.replace(/import\(['"]\.\.\/files\//g, 'import("../components/');

  // Transform @/components alias if user has different setup
  // For now, keep imports as-is since they use relative paths
  // In the future, we can add more sophisticated transformations

  // Optionally transform based on user's alias configuration
  if (config.aliases['@/components']) {
    // Keep relative imports as-is for now
    // Future: transform to use user's aliases if they prefer
  }

  return transformed;
}

export function transformPaths(filePath: string, config: ReplykeConfig): string {
  // Transform file paths if needed
  // For now, just return as-is
  return filePath;
}
