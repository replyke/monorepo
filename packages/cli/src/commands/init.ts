import prompts from 'prompts';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { detectProjectType, detectTypeScript } from '../utils/detect.js';

export interface SublayConfig {
  platform: 'react' | 'react-native' | 'expo';
  style: 'styled' | 'tailwind';
  typescript: boolean;
  paths: {
    components: string;
  };
  aliases: {
    '@/components': string;
  };
}

export async function init() {
  console.log(chalk.bold('\n🚀 Welcome to Sublay CLI\n'));

  // Detect project type
  const projectType = await detectProjectType();
  const hasTypeScript = await detectTypeScript();

  // Without a TTY there is nobody to answer the prompts below; prompts() would
  // resolve to an empty object and we'd write nothing while exiting 0. Fail loudly.
  if (!process.stdin.isTTY) {
    console.error(
      chalk.red(
        '\n❌ sublay init requires an interactive terminal — no TTY detected.'
      )
    );
    console.error(
      chalk.dim(
        '   Run it directly in a terminal, not through a script or pipe.\n'
      )
    );
    process.exit(1);
  }

  // Prompt user for configuration
  const answers = await prompts([
    {
      type: 'select',
      name: 'platform',
      message: 'Which platform are you using?',
      choices: [
        { title: 'React (Web)', value: 'react' },
        { title: 'React Native', value: 'react-native' },
        { title: 'Expo', value: 'expo' },
      ],
      initial:
        projectType === 'expo' ? 2 : projectType === 'react-native' ? 1 : 0,
    },
    {
      type: 'select',
      name: 'style',
      message: 'Which styling approach?',
      choices: [
        { title: 'Tailwind CSS', value: 'tailwind' },
        { title: 'Inline Styles', value: 'styled' },
      ],
    },
    {
      type: 'text',
      name: 'componentsPath',
      message: 'Where should components be installed?',
      initial: 'src/components',
    },
  ]);

  if (!answers.platform) {
    console.log(chalk.yellow('\n⚠️  Setup cancelled'));
    process.exit(0);
  }

  // Create configuration
  const componentsPath = answers.componentsPath || 'src/components';

  const config: SublayConfig = {
    platform: answers.platform,
    style: answers.style || 'styled',
    typescript: hasTypeScript,
    paths: {
      components: componentsPath,
    },
    aliases: {
      '@/components': `./${componentsPath}`,
    },
  };

  // Write configuration file
  const configPath = path.join(process.cwd(), 'sublay.json');
  await fs.writeJson(configPath, config, { spaces: 2 });

  console.log(chalk.green('\n✅ Configuration saved to sublay.json'));

  console.log(chalk.bold('\n🎉 Sublay CLI initialized successfully!\n'));
  console.log(chalk.dim('Next steps:'));
  console.log(chalk.dim('  1. Run: npx @sublay/cli add <component-name>'));
  console.log(chalk.dim('     Available: comments-threaded, comments-social, notifications-control'));
  console.log(chalk.dim('  2. Import components in your app'));
  console.log(chalk.dim('  3. Customize styles directly in the component files\n'));
}
