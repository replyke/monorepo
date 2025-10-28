import prompts from 'prompts';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { detectProjectType } from '../utils/detect.js';
import { checkDependencies } from '../utils/dependencies.js';

export interface ReplykeConfig {
  platform: 'react' | 'react-native' | 'expo';
  style: 'styled' | 'tailwind';
  typescript: boolean;
  paths: {
    components: string;
    lib: string;
  };
  aliases: {
    '@/components': string;
    '@/lib': string;
  };
}

export async function init() {
  console.log(chalk.bold('\n🚀 Welcome to Replyke CLI\n'));

  // Detect project type
  const projectType = await detectProjectType();

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
      initial: projectType === 'react-native' ? 1 : 0,
    },
    {
      type: 'select',
      name: 'style',
      message: 'Which styling approach?',
      choices: [
        { title: 'Inline Styles (more portable)', value: 'styled' },
        { title: 'Tailwind CSS (coming soon)', value: 'tailwind', disabled: true },
      ],
    },
    {
      type: 'text',
      name: 'componentsPath',
      message: 'Where should components be installed?',
      initial: 'src/components',
    },
    {
      type: 'text',
      name: 'libPath',
      message: 'Where should utility files be installed?',
      initial: 'src/lib',
    },
  ]);

  if (!answers.platform) {
    console.log(chalk.yellow('\n⚠️  Setup cancelled'));
    process.exit(0);
  }

  // Create configuration
  const config: ReplykeConfig = {
    platform: answers.platform,
    style: answers.style || 'styled',
    typescript: true,
    paths: {
      components: answers.componentsPath || 'src/components',
      lib: answers.libPath || 'src/lib',
    },
    aliases: {
      '@/components': `./src/components`,
      '@/lib': `./src/lib`,
    },
  };

  // Write configuration file
  const configPath = path.join(process.cwd(), 'replyke.json');
  await fs.writeJson(configPath, config, { spaces: 2 });

  console.log(chalk.green('\n✅ Configuration saved to replyke.json'));

  // Check for peer dependencies
  await checkDependencies(config.platform);

  console.log(chalk.bold('\n🎉 Replyke CLI initialized successfully!\n'));
  console.log(chalk.dim('Next steps:'));
  console.log(chalk.dim('  1. Run: npx @replyke/cli add comments-threaded'));
  console.log(chalk.dim('  2. Import components in your app'));
  console.log(chalk.dim('  3. Customize styles directly in the component files\n'));
}
