import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * absolute path to project root with optional joined path partials
 */
export function rootPath(...slugs: string[]): string {
  const path = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
  return join(path, ...slugs);
}
