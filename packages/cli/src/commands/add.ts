import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import ora from "ora";
import { ReplykeConfig } from "./init.js";
import { fetchRegistry, fetchFile, Registry } from "../utils/registry.js";
import { transformImports } from "../utils/transform.js";
import { checkComponentDependencies } from "../utils/dependencies.js";

export async function add(componentName: string) {
  const spinner = ora("Initializing...").start();

  try {
    // Read configuration
    const configPath = path.join(process.cwd(), "replyke.json");

    if (!(await fs.pathExists(configPath))) {
      spinner.fail("No replyke.json found");
      console.log(chalk.yellow("\n⚠️  Please run: npx @replyke/cli init"));
      process.exit(1);
    }

    const config: ReplykeConfig = await fs.readJson(configPath);

    spinner.text = `Fetching ${componentName}...`;

    // Fetch registry metadata
    const registry = await fetchRegistry(componentName, config);

    if (!registry) {
      spinner.fail(`Component "${componentName}" not found`);
      process.exit(1);
    }

    spinner.text = "Downloading files...";

    // Download and install each file
    let filesInstalled = 0;

    for (const file of registry.files) {
      // Skip development files
      if (shouldExcludeFile(file.path)) {
        continue;
      }

      const fileContent = await fetchFile(registry.registryUrl, file.path);

      if (!fileContent) {
        console.log(chalk.yellow(`\n⚠️  Could not fetch ${file.path}`));
        continue;
      }

      // Transform imports to match user's project
      let transformed = transformImports(fileContent, config);

      // Determine target path
      const targetPath = getTargetPath(file.path, config, componentName);
      const fullPath = path.join(process.cwd(), targetPath);

      //       // Add @internal JSDoc comment for component files to discourage direct imports
      //       if (file.path.startsWith('files/') || file.path.startsWith('hooks/')) {
      //         const internalComment = `/**
      //  * @internal
      //  * Import from the barrel export instead:
      //  * import { ${toPascalCase(path.basename(file.path, path.extname(file.path)))} } from '@/components/${componentName}'
      //  */\n\n`;
      //         transformed = internalComment + transformed;
      //       }

      // Ensure directory exists
      await fs.ensureDir(path.dirname(fullPath));

      // Write file
      await fs.writeFile(fullPath, transformed, "utf-8");
      filesInstalled++;
    }

    // Create barrel export index file
    spinner.text = "Creating index file...";
    await createIndexFile(componentName, config, registry);
    filesInstalled++;

    spinner.succeed(`Added ${componentName}`);

    // Show success message
    console.log(
      chalk.green(`\n✅ Successfully installed ${filesInstalled} files!`)
    );
    console.log(
      chalk.dim(
        `\n📁 Files added to ${path.join(
          config.paths.components,
          componentName
        )}`
      )
    );

    // Check dependencies
    await checkComponentDependencies(registry.dependencies);

    // Show usage example
    const componentInfo = getComponentInfo(registry);
    const relativeImportPath = path.relative(
      process.cwd(),
      path.join(config.paths.components, componentName)
    );
    console.log(chalk.bold("\n📖 Usage:"));
    console.log(
      chalk.dim(
        `  import { ${componentInfo.mainComponent} } from './${relativeImportPath}';`
      )
    );
    console.log(chalk.dim(`  // With types:`));
    console.log(
      chalk.dim(
        `  import { ${componentInfo.mainComponent}, type ${componentInfo.typeExport} } from './${relativeImportPath}';`
      )
    );
    console.log();
  } catch (error) {
    spinner.fail("Failed to add component");
    console.error(chalk.red("\n❌ Error:"), error);
    process.exit(1);
  }
}

function getTargetPath(
  filePath: string,
  config: ReplykeConfig,
  componentName: string
): string {
  // Create parent directory for the component
  const componentDir = path.join(config.paths.components, componentName);

  // Check if it's a hook, util, or context file
  if (filePath.startsWith("hooks/")) {
    return path.join(componentDir, "hooks", path.basename(filePath));
  }
  if (filePath.startsWith("utils/")) {
    return path.join(componentDir, "utils", path.basename(filePath));
  }
  if (filePath.startsWith("context/")) {
    return path.join(componentDir, "context", path.basename(filePath));
  }

  // Component files from 'files/' go into 'components/' subdirectory
  if (filePath.startsWith("files/")) {
    const normalizedPath = filePath.substring(6); // Remove 'files/' prefix
    return path.join(componentDir, "components", normalizedPath);
  }

  // Fallback for any other files
  return path.join(componentDir, filePath);
}

async function createIndexFile(
  componentName: string,
  config: ReplykeConfig,
  registry: Registry
): Promise<void> {
  const componentDir = path.join(
    process.cwd(),
    config.paths.components,
    componentName
  );
  const indexPath = path.join(componentDir, "index.ts");

  // Get component info dynamically
  const componentInfo = getComponentInfo(registry);

  // Generate index content dynamically
  const indexContent = `export { default as ${componentInfo.mainComponent} } from './components/${componentInfo.mainFile}';
export * from './components/${componentInfo.mainFile}';
`;

  // Write index file
  await fs.writeFile(indexPath, indexContent, "utf-8");
}

function toPascalCase(str: string): string {
  return str
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}

interface ComponentInfo {
  mainComponent: string;
  mainFile: string;
  typeExport: string;
}

function getComponentInfo(registry: Registry): ComponentInfo {
  // Registry exports metadata is now required
  return {
    mainComponent: registry.exports.mainComponent,
    mainFile: registry.exports.mainFile,
    typeExport: registry.exports.typeExports?.[0] || "",
  };
}

/**
 * Check if a file should be excluded from installation (development files only)
 */
function shouldExcludeFile(filePath: string): boolean {
  const fileName = path.basename(filePath);
  const excludedFiles = [
    'package.json',
    'tsconfig.json',
    '.gitignore',
    'pnpm-lock.yaml',
    'package-lock.json',
    'yarn.lock',
    '.eslintrc',
    '.prettierrc',
  ];

  // Exclude specific files
  if (excludedFiles.includes(fileName)) {
    return true;
  }

  // Exclude node_modules directory
  if (filePath.includes('node_modules')) {
    return true;
  }

  // Exclude hidden files (starting with .)
  if (fileName.startsWith('.')) {
    return true;
  }

  return false;
}
