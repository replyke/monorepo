/**
 * Strip TypeScript types from code and convert to JavaScript
 * Uses ts-blank-space to preserve original formatting and JSX syntax
 * @param code - The TypeScript source code
 * @param filePath - The file path (used to determine if it's .tsx or .ts)
 * @returns JavaScript code with types removed and JSX preserved
 */
export async function stripTypes(code: string, filePath: string): Promise<string> {
  try {
    // Lazy load ts-blank-space only when needed (for JavaScript projects)
    const tsBlankSpace = (await import('ts-blank-space')).default;

    // ts-blank-space default export: (code: string) => string
    // Automatically handles both .ts and .tsx files
    const result = tsBlankSpace(code);

    return result;
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
