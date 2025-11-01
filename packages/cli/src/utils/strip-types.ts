/**
 * Strip TypeScript types from code and convert to JavaScript
 * Uses detype to preserve original formatting and readability
 * @param code - The TypeScript source code
 * @param filePath - The file path (used to determine if it's .tsx or .ts)
 * @returns JavaScript code with types removed
 */
export async function stripTypes(code: string, filePath: string): Promise<string> {
  try {
    // Lazy load detype only when needed (for JavaScript projects)
    const { detype } = await import('detype');

    const result = await detype(code, {
      filename: filePath,
    });

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
