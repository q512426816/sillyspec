/**
 * junction-rm.js — junction/reparse 点安全删除（坑 git-worktree-remove-pierce，2026-09-24 实证）
 *
 * 根因（R16 批次一收口期三次主仓 node_modules 清空，实证复现）：**`git worktree remove --force`
 * 的递归删在 Windows 跟随 junction**，快照内 node_modules/venv/gate_snapshot.copy 链接的目标
 * 是主仓真身——cleanupSnapshot 第一步 git remove 即清空主仓依赖树（js-yaml
 * ERR_MODULE_NOT_FOUND 连环）。worktree.js cleanup 链的 unlinkNodeModulesLinks 先解链正是
 * 防同一穿透（历史注释另点名 MSYS `rm -rf` 人工操作同款；Node v24 rmSync 在受控测试中
 * 未复现穿透，但先解链对两种删除器都是稳健防御）。Windows 上唯一不跟随目标的删除是
 * `cmd /c rmdir`（reparse 点语义）。
 *
 * 契约：safeRemoveDirWithLinks(p) = 递归收集 p 下全部 lstat 符号链接/junction → 逐个
 * rmdir/unlink 解链 → 再 rmSync(p)。collectLinkPathsUnder/unlinkLinkPath 亦供「先解链再
 * 交给 git 删」的调用序使用（cleanupSnapshot / reclaimStaleGateSnapshots）。任一解链失败
 * → 抛错阻断删除（保护链接目标优先于清理彻底性；调用方留账本待下轮回收——双清契约兼容）。
 */
import { existsSync, readdirSync, lstatSync, rmSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'

/** 删除单个链接路径（junction/symlink 本体，不跟随目标） */
export function unlinkLinkPath(p) {
  if (process.platform === 'win32') {
    execFileSync('cmd.exe', ['/c', 'rmdir', p], { windowsHide: true })
  } else {
    unlinkSync(p)
  }
}

/**
 * 递归收集 root 下全部符号链接/junction 绝对路径（lstat 判定；readdir withFileTypes 对
 * junction 报 isDirectory 不可信）。lstat 失败（EPERM/杀毒锁）→ 抛错保护。
 */
export function collectLinkPathsUnder(root) {
  const links = []
  const walk = (dir) => {
    let entries
    try { entries = readdirSync(dir) } catch { return }
    for (const name of entries) {
      const p = join(dir, name)
      let st
      try { st = lstatSync(p) } catch (e) {
        throw new Error(`junction 检测失败（疑似 EPERM：杀毒/索引锁——阻断删除以保护链接目标）：${p}: ${e.message}`)
      }
      if (st.isSymbolicLink()) {
        links.push(p)
        continue
      }
      if (st.isDirectory()) walk(p)
    }
  }
  walk(root)
  return links
}

/**
 * 安全删除目录：先解链其下全部 junction/symlink 再 rmSync。
 * @throws 解链失败时抛错（不回落裸 rmSync——那会穿透链接删目标，见文件首注释）
 */
export function safeRemoveDirWithLinks(p, opts = {}) {
  if (!existsSync(p)) return
  for (const link of collectLinkPathsUnder(p)) {
    try {
      unlinkLinkPath(link)
    } catch (e) {
      throw new Error(`junction 解链失败（保护链接目标，阻断删除——手动 rmdir "${link}" 后重试）: ${e.message}`)
    }
  }
  rmSync(p, { recursive: true, force: true, ...opts })
}
