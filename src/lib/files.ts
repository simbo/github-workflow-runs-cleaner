import { access, constants, readFile as fsReadFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export async function fileIsReadable(path: string): Promise<boolean> {
  try {
    await access(path, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

export async function fileIsWritable(path: string): Promise<boolean> {
  try {
    if (!(await fileExists(path))) {
      return fileIsWritable(dirname(path));
    }
    await access(path, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

export async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function readFile<O = string>(path: string, parseJson: boolean): Promise<O>;
export async function readFile<O = { [key: string]: any }>(path: string): Promise<O>; // eslint-disable-line @typescript-eslint/no-explicit-any
export async function readFile<O>(path: string, parseJson = true): Promise<O> {
  const content = (await fsReadFile(path)).toString();
  return parseJson ? JSON.parse(content) : content;
}
