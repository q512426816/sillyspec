import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * 读取 package.json 版本号。
 * 独立轻量模块：只依赖 fs/path/url，不拖入 init.js 的 @inquirer/prompts 等重型交互库。
 * 供 index.js 顶部静态 import——--version 等高频路径不再为 getVersion 付 init.js 加载税。
 */
export function getVersion() {
  try {
    const pkg = JSON.parse(readFileSync(resolve(__dirname, '..', 'package.json'), 'utf8'));
    return pkg.version;
  } catch {
    return '?.?.?';
  }
}
