/**
 * spawn-settle —— detached 子进程孵化稳定化（2026-10-21-p0-p1-hardening FR-08）
 *
 * 背景（dsh z1/z2 各实证一次）：Windows 下父进程 spawn detached 子进程（watcher/bg-sync）后
 * 立即退出，可触发 Node libuv 退出断言崩溃（`Assertion failed: !(handle->flags &
 * UV_HANDLE_CLOSING) src\win\async.c`）——把本已成功的 CLI 调用污染成 exit 1。根因在 Node
 * 运行时（父进程退出与子进程 async 句柄建立竞态），应用层无法根除；本 util 提供有界缓解：
 * spawn 后等子进程 'spawn' 事件（孵化完成、句柄建立完毕）或 'error' 再放行，上限 timeoutMs
 * 兜底——把「父进程在句柄建立中途退出」的竞态窗口压掉。best-effort：任何异常路径直接返回，
 * 绝不影响命令功能。
 */
import { EventEmitter } from 'node:events';

/**
 * 等待 detached 子进程孵化稳定。
 * @param {import('node:child_process').ChildProcess} child
 * @param {number} [timeoutMs=150] 兜底上限（'spawn'/'error' 均未发出时按此时长放行）
 * @returns {Promise<void>} 事件到达 / 兜底超时 / child 已退出 / child 非法形态——均 resolve（永不 reject）
 */
export async function awaitSpawnSettled(child, timeoutMs = 150) {
  if (!child || typeof child.once !== 'function') return;
  // 已退出（同步失败形态：exitCode/signalCode 已定）——无句柄在途，立即返回
  if (child.exitCode !== null && child.exitCode !== undefined) return;
  if (child.signalCode) return;
  await new Promise((resolve) => {
    let settled = false;
    const fin = () => {
      if (settled) return;
      settled = true;
      try { child.off('spawn', fin); child.off('error', fin); } catch { /* 已解绑/非 EventEmitter——best-effort */ }
      resolve();
    };
    child.once('spawn', fin);
    child.once('error', fin);
    // 上限兜底：两事件都不发（异常宿主/极端调度）也不让调用方久等
    const t = setTimeout(fin, timeoutMs);
    t.unref?.();
  });
}

/** 测试辅助：构造最小 child 形态（EventEmitter + exitCode/signalCode 字段）。 */
export function fakeChildForTest({ exitCode = null, signalCode = null } = {}) {
  const c = new EventEmitter();
  c.exitCode = exitCode;
  c.signalCode = signalCode;
  return c;
}
