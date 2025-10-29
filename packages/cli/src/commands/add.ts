import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { ReplykeConfig } from './init.js';
import { fetchRegistry, fetchFile, Registry } from '../utils/registry.js';
import { transformImports } from '../utils/transform.js';

export async function add(componentName: string) {
  const spinner = ora('Initializing...').start();

  try {
    // Read configuration
    const configPath = path.join(process.cwd(), 'replyke.json');

    if (!(await fs.pathExists(configPath))) {
      spinner.fail('No replyke.json found');
      console.log(chalk.yellow('\n⚠️  Please run: npx @replyke/cli init'));
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

    spinner.text = 'Downloading files...';

    // Download and install each file
    let filesInstalled = 0;

    for (const file of registry.files) {
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
      await fs.writeFile(fullPath, transformed, 'utf-8');
      filesInstalled++;
    }

    // Create barrel export index file
    spinner.text = 'Creating index file...';
    await createIndexFile(componentName, config, registry);
    filesInstalled++;

    spinner.succeed(`Added ${componentName}`);

    // Show success message
    console.log(chalk.green(`\n✅ Successfully installed ${filesInstalled} files!`));
    console.log(chalk.dim(`\n📁 Files added to ${path.join(config.paths.components, componentName)}`));

    // Check dependencies
    checkComponentDependencies(registry.dependencies);

    // Show usage example
    const relativeImportPath = path.relative(process.cwd(), path.join(config.paths.components, componentName));
    console.log(chalk.bold('\n📖 Usage:'));
    console.log(chalk.dim(`  import { ThreadedCommentSection } from './${relativeImportPath}';`));
    console.log(chalk.dim(`  // With types:`));
    console.log(chalk.dim(`  import { ThreadedCommentSection, type ThreadedStyleCallbacks } from './${relativeImportPath}';`));
    console.log();

  } catch (error) {
    spinner.fail('Failed to add component');
    console.error(chalk.red('\n❌ Error:'), error);
    process.exit(1);
  }
}

function getTargetPath(filePath: string, config: ReplykeConfig, componentName: string): string {
  // Create parent directory for the component
  const componentDir = path.join(config.paths.components, componentName);

  // Check if it's a hook, util, or context file
  if (filePath.startsWith('hooks/')) {
    return path.join(componentDir, 'hooks', path.basename(filePath));
  }
  if (filePath.startsWith('utils/')) {
    return path.join(componentDir, 'utils', path.basename(filePath));
  }
  if (filePath.startsWith('context/')) {
    return path.join(componentDir, 'context', path.basename(filePath));
  }

  // Component files from 'files/' go into 'components/' subdirectory
  if (filePath.startsWith('files/')) {
    const normalizedPath = filePath.substring(6); // Remove 'files/' prefix
    return path.join(componentDir, 'components', normalizedPath);
  }

  // Fallback for any other files
  return path.join(componentDir, filePath);
}

async function createIndexFile(
  componentName: string,
  config: ReplykeConfig,
  registry: Registry
): Promise<void> {
  const componentDir = path.join(process.cwd(), config.paths.components, componentName);
  const indexPath = path.join(componentDir, 'index.ts');

  // Hardcoded index content for comments-threaded
  const indexContent = `export { default as ThreadedCommentSection } from './components/threaded-comment-section';
export * from './components/threaded-comment-section';
`;

  // Write index file
  await fs.writeFile(indexPath, indexContent, 'utf-8');
}

function toPascalCase(str: string): string {
  return str
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

function checkComponentDependencies(dependencies: string[]) {
  console.log(chalk.bold('\n📦 Required dependencies:'));
  dependencies.forEach((dep) => {
    const [name, version] = dep.split('@').filter(Boolean);
    console.log(chalk.dim(`  - ${name}@${version || 'latest'}`));
  });
  console.log(chalk.dim('\nMake sure these are installed in your project.\n'));
}
