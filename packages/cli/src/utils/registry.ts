import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { ReplykeConfig } from '../commands/init.js';

export interface RegistryFile {
  path: string;
  type: string;
  description: string;
}

export interface Registry {
  name: string;
  platform: string;
  style: string;
  version: string;
  description: string;
  dependencies: string[];
  files: RegistryFile[];
  registryUrl: string;
  exports: {
    mainComponent: string;
    mainFile: string;
    typeExports?: string[];
  };
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// For local testing, use the local registry directory
// From dist/ (built) or src/utils/ (source), go up to cli root, then to registry
const LOCAL_REGISTRY_PATH = path.resolve(__dirname, '..', '..', '..', 'registry');

export async function fetchRegistry(
  componentName: string,
  config: ReplykeConfig
): Promise<Registry | null> {
  try {
    // Construct registry path
    const registryPath = path.join(
      LOCAL_REGISTRY_PATH,
      config.platform,
      componentName,
      config.style,
      'registry.json'
    );

    // Check if local registry exists (for development)
    const localExists = await fs.pathExists(registryPath);

    if (localExists) {
      return await fs.readJson(registryPath);
    }

    // Fetch from GitHub (for production/npx usage)
    const url = `https://raw.githubusercontent.com/replyke/cli/main/registry/${config.platform}/${componentName}/${config.style}/registry.json`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 404) {
          console.error(`Component "${componentName}" with style "${config.style}" not found in registry.`);
        } else {
          console.error(`Failed to fetch registry from ${url}: ${response.status} ${response.statusText}`);
        }
        return null;
      }

      return await response.json();
    } catch (fetchError) {
      console.error(`Error fetching from GitHub (${url}):`, fetchError);
      return null;
    }
  } catch (error) {
    console.error('Error fetching registry:', error);
    return null;
  }
}

export async function fetchFile(
  registryUrl: string,
  filePath: string
): Promise<string | null> {
  try {
    // For local development, extract platform/component/style from registryUrl
    // registryUrl format: .../registry/react/comments-threaded/styled or .../registry/react/comments-threaded/tailwind
    const urlParts = registryUrl.split('/');
    const style = urlParts[urlParts.length - 1]; // Get last part (styled or tailwind)
    const componentName = urlParts[urlParts.length - 2]; // Get component name
    const platform = urlParts[urlParts.length - 3]; // Get platform

    const localPath = path.join(
      LOCAL_REGISTRY_PATH,
      platform,
      componentName,
      style,
      filePath
    );

    const localExists = await fs.pathExists(localPath);

    if (localExists) {
      return await fs.readFile(localPath, 'utf-8');
    }

    // Fetch from GitHub (for production/npx usage)
    const fileUrl = `${registryUrl}/${filePath}`;

    try {
      const response = await fetch(fileUrl);

      if (!response.ok) {
        console.error(`Failed to fetch file from ${fileUrl}: ${response.status} ${response.statusText}`);
        return null;
      }

      return await response.text();
    } catch (fetchError) {
      console.error(`Error fetching file from GitHub (${fileUrl}):`, fetchError);
      return null;
    }
  } catch (error) {
    console.error(`Error fetching file ${filePath}:`, error);
    return null;
  }
}
