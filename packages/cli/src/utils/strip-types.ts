/**
 * Strip TypeScript types from code and preserve JSX syntax
 * Uses Babel with @babel/preset-typescript and @babel/plugin-syntax-jsx
 * @param code - The TypeScript source code
 * @param filePath - The file path (used for error reporting)
 * @returns JavaScript code with types removed and JSX preserved
 */
export async function stripTypes(code: string, filePath: string): Promise<string> {
  try {
    // Lazy load Babel only when needed (for JavaScript projects)
    const { transform } = await import('@babel/core');
    // Import preset and plugin directly (not as strings) for lazy loading
    const presetTypescript = (await import('@babel/preset-typescript')).default;
    const pluginSyntaxJsx = (await import('@babel/plugin-syntax-jsx')).default;

    const result = transform(code, {
      filename: filePath,
      presets: [
        [presetTypescript, {
          isTSX: true,           // Enable TSX parsing
          allExtensions: true    // Parse all files as TS/TSX
        }]
      ],
      plugins: [pluginSyntaxJsx],  // Pass the actual plugin function
      configFile: false,        // Don't look for babel.config.js
      babelrc: false,           // Don't look for .babelrc
      sourceMaps: false,        // No source maps needed
      compact: false,           // Don't minimize output
      retainLines: true         // Try to keep line numbers similar
    });

    if (!result || !result.code) {
      throw new Error('Babel transformation returned no code');
    }

    return result.code;
  } catch (error) {
    throw new Error(
      `Failed to strip types from ${filePath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Convert TypeScript file extension to JavaScript equivalent
 * @param filePath - The original file path
 * @returns File path with .js or .jsx extension
 */
export function convertFileExtension(filePath: string): string {
  return filePath.replace(/\.tsx?$/, (match) => {
    return match === '.tsx' ? '.jsx' : '.js';
  });
}
