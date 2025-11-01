import prompts from 'prompts';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { detectProjectType, detectTypeScript } from '../utils/detect.js';

export interface ReplykeConfig {
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
  console.log(chalk.bold('\n🚀 Welcome to Replyke CLI\n'));

  // Detect project type
  const projectType = await detectProjectType();
  const hasTypeScript = await detectTypeScript();

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
  const config: ReplykeConfig = {
    platform: answers.platform,
    style: answers.style || 'styled',
    typescript: hasTypeScript,
    paths: {
      components: answers.componentsPath || 'src/components',
    },
    aliases: {
      '@/components': `./src/components`,
    },
  };

  // Write configuration file
  const configPath = path.join(process.cwd(), 'replyke.json');
  await fs.writeJson(configPath, config, { spaces: 2 });

  console.log(chalk.green('\n✅ Configuration saved to replyke.json'));

  console.log(chalk.bold('\n🎉 Replyke CLI initialized successfully!\n'));
  console.log(chalk.dim('Next steps:'));
  console.log(chalk.dim('  1. Run: npx @replyke/cli add <component-name>'));
  console.log(chalk.dim('     Available: comments-threaded, comments-social, notifications-control'));
  console.log(chalk.dim('  2. Import components in your app'));
  console.log(chalk.dim('  3. Customize styles directly in the component files\n'));
}
