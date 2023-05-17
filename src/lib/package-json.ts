import { readFile } from 'node:fs/promises';

import { rootPath } from './root-path.js';

const packageJson = await readFile(rootPath('package.json'));

interface PackageJson {
  name: string;
  title: string;
  version: string;
  homepage: string;
}

export const { name, title, version, homepage } = JSON.parse(packageJson.toString()) as PackageJson;
