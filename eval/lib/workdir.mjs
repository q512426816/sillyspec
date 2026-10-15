// 被测工作副本：每个 (task, arm) 一个独立目录，从任务 files/ 复制脚手架。
// 每次重跑前清空重建，保证 agent 面对的初始状态确定。目录保留不删（排查用），在 .gitignore 里。
import { cpSync, existsSync, mkdirSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';

// Windows 下刚退出的子进程句柄可能滞后释放，直接 rmSync 会 EPERM：
// 先带重试删；仍失败则改名隔离（.stale），新一轮照常进行，遗留目录不影响判分。
function removeDir(p) {
  try {
    rmSync(p, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  } catch {
    const stale = `${p}.stale`;
    try {
      rmSync(stale, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
      renameSync(p, stale);
    } catch { /* 双重失败只能上抛，fail-loud */ }
  }
}

export function prepareWorkdir(workdirRoot, taskId, arm, filesDir) {
  // run- 前缀：目录段禁以数字开头——claude CLI 沙箱把允许目录路径里的 \004 形态（taskId 数字
  // 开头）当八进制转义序列处理，前缀比对恒失败 → workdir 内一切写入被硬拦（2026-10-15 首次
  // 真实 A/B 双臂实证，判分 fail 与 agent 能力无关）。run- 使路径段以字母开头，歧义消失。
  const workdir = join(workdirRoot, `run-${taskId}__arm${arm}`);
  removeDir(workdir);
  mkdirSync(workdir, { recursive: true });
  if (existsSync(filesDir)) cpSync(filesDir, workdir, { recursive: true });
  return workdir;
}

export function copyInto(workdir, sourceDir) {
  if (existsSync(sourceDir)) cpSync(sourceDir, workdir, { recursive: true });
}
