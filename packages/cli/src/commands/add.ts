import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import ora from "ora";
import { SublayConfig } from "./init.js";
import { fetchRegistry, fetchFile, Registry } from "../utils/registry.js";
import { transformImports } from "../utils/transform.js";
import { checkComponentDependencies } from "../utils/dependencies.js";
import { stripTypes, convertFileExtension } from "../utils/strip-types.js";

export async function add(componentName: string) {
  const spinner = ora("Initializing...").start();

  try {
    // Read configuration
    const configPath = path.join(process.cwd(), "sublay.json");

    if (!(await fs.pathExists(configPath))) {
      spinner.fail("No sublay.json found");
      console.log(chalk.yellow("\n⚠️  Please run: npx @sublay/cli init"));
      process.exit(1);
    }

    // sublay.json is written by `init`, but it is just a file on disk: it gets
    // hand-edited, half-written by non-interactive scaffolding, or copied
    // between projects. Anything missing surfaces much later as an internal
    // TypeError inside path.join()/transformImports(), so validate up front.
    let rawConfig: unknown;
    try {
      rawConfig = await fs.readJson(configPath);
    } catch {
      // Invalid JSON — treated exactly like an invalid shape below.
      rawConfig = null;
    }

    if (!isValidConfig(rawConfig)) {
      spinner.fail("sublay.json is malformed");
      console.error(
        chalk.red(
          "\n❌ sublay.json is missing or malformed — delete it and run `npx @sublay/cli init` again."
        )
      );
      process.exit(1);
    }

    const config: SublayConfig = rawConfig;

    // Warn (but never block) when an existing install is about to be overwritten.
    const componentDir = path.join(
      process.cwd(),
      config.paths.components,
      componentName
    );

    if (await fs.pathExists(componentDir)) {
      spinner.stop();
      console.log(
        chalk.yellow(`⚠️  Overwriting existing component: ${componentName}`)
      );
      spinner.start(`Fetching ${componentName}...`);
    }

    spinner.text = `Fetching ${componentName}...`;

    // Fetch registry metadata
    const registry = await fetchRegistry(componentName, config);

    if (!registry) {
      spinner.fail(`Component "${componentName}" not found`);
      process.exit(1);
    }

    // Expo projects use @sublay/expo instead of @sublay/react-native
    if (config.platform === 'expo') {
      registry.dependencies = registry.dependencies.map((dep) =>
        dep.startsWith('@sublay/react-native')
          ? dep.replace('@sublay/react-native', '@sublay/expo')
          : dep
      );
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

      // Strip TypeScript types if project is JavaScript
      let finalFilePath = file.path;
      if (!config.typescript && (file.path.endsWith('.ts') || file.path.endsWith('.tsx'))) {
        transformed = await stripTypes(transformed, file.path);
        finalFilePath = convertFileExtension(file.path);
      }

      // Determine target path
      const targetPath = getTargetPath(finalFilePath, config, componentName);
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
    if (componentInfo.typeExport) {
      console.log(chalk.dim(`  // With types:`));
      console.log(
        chalk.dim(
          `  import { ${componentInfo.mainComponent}, type ${componentInfo.typeExport} } from './${relativeImportPath}';`
        )
      );
    }

    // Some dependencies need app-level wiring the installer cannot do for you.
    printAppSetupNotes(registry.dependencies);

    console.log();
  } catch (error) {
    spinner.fail("Failed to add component");
    console.error(chalk.red("\n❌ Error:"), error);
    process.exit(1);
  }
}

/**
 * Structural check for a config loaded off disk. `fs.readJson` returns `any`,
 * so the `SublayConfig` annotation at the call site is an assertion, not a
 * guarantee — this is the only thing standing between a truncated or
 * hand-edited sublay.json and a raw stack trace.
 */
function isValidConfig(value: unknown): value is SublayConfig {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const config = value as Record<string, unknown>;

  if (
    config.platform !== "react" &&
    config.platform !== "react-native" &&
    config.platform !== "expo"
  ) {
    return false;
  }

  if (config.style !== "styled" && config.style !== "tailwind") {
    return false;
  }

  if (typeof config.typescript !== "boolean") {
    return false;
  }

  const paths = config.paths;
  if (typeof paths !== "object" || paths === null) {
    return false;
  }
  if (typeof (paths as Record<string, unknown>).components !== "string") {
    return false;
  }

  const aliases = config.aliases;
  if (typeof aliases !== "object" || aliases === null) {
    return false;
  }
  if (typeof (aliases as Record<string, unknown>)["@/components"] !== "string") {
    return false;
  }

  return true;
}

/**
 * Print notes for dependencies that require app-level setup the CLI can't perform.
 */
function printAppSetupNotes(dependencies: string[]): void {
  const deps = dependencies.map((dep) => dep.toLowerCase());
  const usesNativeWind = deps.some((dep) => dep.includes('nativewind'));
  const usesBottomSheet = deps.some((dep) => dep.includes('@gorhom/bottom-sheet'));

  if (!usesNativeWind && !usesBottomSheet) {
    return;
  }

  console.log(chalk.bold('\n🔧 App-level setup required:'));

  if (usesNativeWind) {
    console.log(
      chalk.yellow('  • NativeWind: these files use `className` props.')
    );
    console.log(
      chalk.dim(
        '    Wire up babel.config.js, metro.config.js, and add this component'
      )
    );
    console.log(
      chalk.dim("    directory to your Tailwind config's `content` globs.")
    );
  }

  if (usesBottomSheet) {
    console.log(
      chalk.yellow('  • Bottom sheets need a gesture-handler root.')
    );
    console.log(
      chalk.dim(
        '    Wrap your app root in <GestureHandlerRootView style={{ flex: 1 }}>'
      )
    );
    console.log(chalk.dim("    from 'react-native-gesture-handler'."));
  }

  console.log(chalk.dim('\n  Setup guides: https://docs.sublay.io'));
}

function getTargetPath(
  filePath: string,
  config: SublayConfig,
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
  config: SublayConfig,
  registry: Registry
): Promise<void> {
  const componentDir = path.join(
    process.cwd(),
    config.paths.components,
    componentName
  );

  // Use .js for JavaScript projects, .ts for TypeScript projects
  const indexExtension = config.typescript ? 'ts' : 'js';
  const indexPath = path.join(componentDir, `index.${indexExtension}`);

  // Get component info dynamically
  const componentInfo = getComponentInfo(registry);

  // Generate index content dynamically
  const indexContent = `export { default as ${componentInfo.mainComponent} } from './components/${componentInfo.mainFile}';
export * from './components/${componentInfo.mainFile}';
`;

  // Write index file
  await fs.writeFile(indexPath, indexContent, "utf-8");
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
