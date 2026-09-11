/**
 * gate-snapshot.js — quick --done test+lint 门禁的隔离快照执行（2026-09-10 驾驭小结第六批②，
 * 用户实证「lint 实测对账在主仓跑，被并行会话的脏文件拦门」）。
 *
 * 问题：门禁在主仓工作区跑 commands.test/lint——多会话共享仓里并行会话的未提交 src/test
 * 改动（语法错误/半成品/锚漂）会污染实测结果，把无辜会话的 --done 拦在门上（只能走
 * advisory 逃生口）。
 *
 * 修法：HEAD 干净快照 + 会话文件 overlay——`git worktree add --detach <tmp> HEAD` 取干净
 * 基线（并行脏文件天然不在），把本会话审计/声明的变更文件覆盖进快照，node_modules 经
 * junction 复用主仓依赖（零拷贝），local.yaml 从主仓复制（gitignore 不进 HEAD），在快照
 * cwd 跑对账。快照基建任何失败 → 返回 null，调用方回退主仓现行为（零回归兜底）。
 *
 * 快照生命周期：一次门禁一批（create → run → cleanup）；崩溃残留由 git worktree prune /
 * 临时目录自然回收（OS tmp 清理），不进主仓 .runtime。
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync, existsSync, readdirSync, statSync, symlinkSync, readFileSync } from 'node:fs'
import { join, dirname, relative, resolve } from 'node:path'
import { tmpdir } from 'node:os'

function git(cwd, args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 60000 }).trim()
}

/**
 * 创建隔离快照：HEAD worktree + 会话文件 overlay + node_modules junction + local.yaml。
 * @param {{ cwd: string, files: string[] }} opts cwd=主仓根；files=本会话变更文件（仓库根相对 POSIX）
 * @returns {{ snapshotRoot: string, cleanup: () => void, reason?: string }|null} 失败返回 null（调用方回退主仓）
 */
export function createGateSnapshot({ cwd, files }) {
  let snapshotRoot = null
  try {
    // 前置：主仓须是 git 仓且有 HEAD（无 git 环境回退主仓现行为）
    git(cwd, ['rev-parse', 'HEAD'])

    snapshotRoot = mkdtempSync(join(tmpdir(), 'sillyspec-gate-'))
    git(cwd, ['worktree', 'add', '--detach', '--quiet', snapshotRoot, 'HEAD'])

    // 会话文件 overlay：主仓工作区版本覆盖进快照（本会话的最新态；文件不存在=已删，跳过）。
    // .sillyspec/ 跳过面收窄（P2-d 落地实证的快照盲区）：原一刀切跳过整个 .sillyspec/ ——
    // 会话声明的 tracked docs（module-map 补录/知识库/模块卡）进不了快照，门禁读到 HEAD
    // 旧版恒误报（src 未录 module-map 的修复在主仓生效、快照里仍然失败）。真正需要隔离的
    // 是共享运行时面：.runtime/（sqlite 锁/在途 marker）与 quicklog/（跨会话共享账本）；
    // local.yaml 由下方 cfg 段显式复制（单一来源，不经 overlay）。
    let overlaid = 0
    for (const f of files) {
      const isSillyspecRuntime = typeof f === 'string' && (f.startsWith('.sillyspec/.runtime/') || f.startsWith('.sillyspec/quicklog/') || f === '.sillyspec/local.yaml' || f === '.sillyspec/.sillyspec-platform.json')
      if (typeof f !== 'string' || f.includes('..') || f.startsWith('/') || isSillyspecRuntime) continue
      const src = join(cwd, f)
      if (!existsSync(src)) continue
      const dst = join(snapshotRoot, f)
      mkdirSync(dirname(dst), { recursive: true })
      copyFileSync(src, dst)
      overlaid++
    }

    // node_modules junction（依赖主仓安装态；junction Windows 无需特权，POSIX 用 symlink）
    const nmSrc = join(cwd, 'node_modules')
    if (existsSync(nmSrc)) {
      try { symlinkSync(nmSrc, join(snapshotRoot, 'node_modules'), 'junction') }
      catch { /* 依赖链接失败：test/lint 可能跑不起来 → 仍返回快照，命令层报错走 fallback */ }
    }

    // local.yaml（gitignore 不进 HEAD；门禁命令配置来源）+ package-lock 保持 HEAD 版（npm test 不装新依赖）
    for (const cfg of [join('.sillyspec', 'local.yaml')]) {
      const src = join(cwd, cfg)
      if (existsSync(src)) {
        mkdirSync(dirname(join(snapshotRoot, cfg)), { recursive: true })
        copyFileSync(src, join(snapshotRoot, cfg))
      }
    }

    const cleanup = () => {
      try { git(cwd, ['worktree', 'remove', '--force', '--quiet', snapshotRoot]) } catch {
        try { rmSync(snapshotRoot, { recursive: true, force: true }) } catch { /* 残留交 OS tmp 清理 */ }
      }
    }
    return { snapshotRoot, cleanup, overlaid }
  } catch (e) {
    // 基建失败（worktree add 拒绝/磁盘满/…）：尽力清理后回退主仓
    if (snapshotRoot) {
      try { git(cwd, ['worktree', 'remove', '--force', '--quiet', snapshotRoot]) } catch {}
      try { rmSync(snapshotRoot, { recursive: true, force: true }) } catch {}
    }
    return null
  }
}
