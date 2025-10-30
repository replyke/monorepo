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
    if (await fs.pathExists(registryPath)) {
      return await fs.readJson(registryPath);
    }

    // TODO: In production, fetch from GitHub
    // const url = `https://raw.githubusercontent.com/replyke/replyke-components/main/registry/${config.platform}/${componentName}/${config.style}/registry.json`;
    // const response = await fetch(url);
    // return await response.json();

    return null;
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

    if (await fs.pathExists(localPath)) {
      return await fs.readFile(localPath, 'utf-8');
    }

    // TODO: In production, fetch from GitHub
    // const fileUrl = `${registryUrl}/${filePath}`;
    // const response = await fetch(fileUrl);
    // return await response.text();

    return null;
  } catch (error) {
    console.error(`Error fetching file ${filePath}:`, error);
    return null;
  }
}
