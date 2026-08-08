/**
 * fs-atomic.js — 原子文件写 + Windows 友好的 rename 重试
 *
 * 用于 .runtime/*.json、pointer、guard.json 等「会被其他进程 / hook 读取」的配置文件。
 * 保证读者要么看到旧完整内容、要么看到新完整内容，不会读到半截 JSON。
 *
 * 注意：db.js 有自己的 _atomicWriteSync（含 .bak 备份），那是 DB 专属持久化逻辑，
 * 已经过稳定性验证，此处不复用、不替换——保持 db.js 零改动。
 */
import { writeFileSync, renameSync, unlinkSync } from 'fs';
import { dirname, basename, join } from 'path';

// Windows 上杀毒 / 索引 / IDE 占用文件时，rename 偶发这些错误，短退避重试即可
const RENAME_RETRY_CODES = ['EPERM', 'EBUSY', 'EACCES', 'ENOTEMPTY'];

/** 同步退避：优先 Atomics.wait，不可用时退化忙等（仅在 rename 冲突的极端情况触发）。 */
function sleepSync(ms) {
  try {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  } catch {
    const end = Date.now() + ms;
    while (Date.now() < end) { /* busy wait */ }
  }
}

/**
 * rename 带退避重试，覆盖 Windows 偶发的 EPERM/EBUSY/EACCES/ENOTEMPTY。
 * 目录 rename 同样适用（归档移动目录时可复用）。
 * @param {string} from
 * @param {string} to
 * @param {number} [retries=5]
 */
export function renameSyncRetry(from, to, retries = 5) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      renameSync(from, to);
      return;
    } catch (err) {
      lastErr = err;
      const code = err && err.code;
      // 非可重试错误码立即抛出，不浪费时间
      if (!code || !RENAME_RETRY_CODES.includes(code)) throw err;
      if (attempt < retries) sleepSync(15 * (attempt + 1));
    }
  }
  throw lastErr;
}

/**
 * 原子写文本文件：同目录 tmp 写入 → rename 覆盖目标（带 Windows 退避重试）。
 * - tmp 名含 pid，避免多进程并发写同一目标时 tmp 名碰撞（如多会话写 local.yaml）。
 * - rename 失败时清理 tmp，避免留下孤儿 .tmp 文件。
 * - Node 的 rename 在 Windows 上用 MoveFileEx(REPLACE_EXISTING)，可覆盖已存在目标；
 *   EPERM 仅在文件被其他进程锁定时出现，由 renameSyncRetry 退避重试。
 * @param {string} filePath - 目标文件绝对路径
 * @param {string} content - 文件内容
 */
export function writeAtomicSync(filePath, content) {
  const dir = dirname(filePath);
  const tmpPath = join(dir, `.${basename(filePath)}.${process.pid}.tmp`);
  writeFileSync(tmpPath, content);
  try {
    renameSyncRetry(tmpPath, filePath);
  } catch (err) {
    try { unlinkSync(tmpPath); } catch { /* tmp 可能已被 rename 走，忽略 */ }
    throw err;
  }
}
