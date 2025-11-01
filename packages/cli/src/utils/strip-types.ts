/**
 * Strip TypeScript types from code and convert to JavaScript
 * @param code - The TypeScript source code
 * @param filePath - The file path (used to determine if it's .tsx or .ts)
 * @returns JavaScript code with types removed
 */
export async function stripTypes(code: string, filePath: string): Promise<string> {
  try {
    // Lazy load @swc/core only when needed (for JavaScript projects)
    const { transformSync } = await import('@swc/core');

    const isTsx = filePath.endsWith('.tsx');

    const result = transformSync(code, {
      filename: filePath,
      jsc: {
        parser: {
          syntax: 'typescript',
          tsx: isTsx,
        },
        target: 'es2020',
        // Preserve imports/exports as-is
        transform: {
          react: {
            runtime: 'automatic',
          },
        },
      },
      module: {
        type: 'es6',
      },
      // Don't minify, keep formatting readable
      minify: false,
    });

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
