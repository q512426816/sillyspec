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
export function createGateSnapshot({ cwd, files, sourceRoot = null }) {
  let snapshotRoot = null
  try {
    // 前置：主仓须是 git 仓且有 HEAD（无 git 环境回退主仓现行为）
    git(cwd, ['rev-parse', 'HEAD'])

    snapshotRoot = mkdtempSync(join(tmpdir(), 'sillyspec-gate-'))
    git(cwd, ['worktree', 'add', '--detach', '--quiet', snapshotRoot, 'HEAD'])

    // 会话文件 overlay：主仓工作区版本覆盖进快照（本会话的最新态；文件不存在=已删，跳过）。
    // sourceRoot（verify 门定向跑用，2026-09-10 驾驭小结第八批）：overlay 源切换为本变更
    // worktree 根——「--worktree 定向跑本变更分支内容」的快照实现（缺省仍是主仓 cwd）。
    // .sillyspec/ 跳过面收窄（P2-d 落地实证的快照盲区）：原一刀切跳过整个 .sillyspec/ ——
    // 会话声明的 tracked docs（module-map 补录/知识库/模块卡）进不了快照，门禁读到 HEAD
    // 旧版恒误报（src 未录 module-map 的修复在主仓生效、快照里仍然失败）。真正需要隔离的
    // 是共享运行时面：.runtime/（sqlite 锁/在途 marker）与 quicklog/（跨会话共享账本）；
    // local.yaml 由下方 cfg 段显式复制（单一来源，不经 overlay）。
    const overlayRoot = sourceRoot || cwd
    let overlaid = 0
    for (const f of files) {
      const isSillyspecRuntime = typeof f === 'string' && (f.startsWith('.sillyspec/.runtime/') || f.startsWith('.sillyspec/quicklog/') || f === '.sillyspec/local.yaml' || f === '.sillyspec/.sillyspec-platform.json')
      if (typeof f !== 'string' || f.includes('..') || f.startsWith('/') || isSillyspecRuntime) continue
      const src = join(overlayRoot, f)
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

/**
 * verify 门专用快照（2026-09-10 驾驭小结第八批，用户第二次真实阻塞：verify 实测门跑
 * main 工作区，多会话并发任何人的 WIP 都能弄红别人的门）。等价「--worktree 定向跑」：
 * overlay 文件集 = resolveVerifyChangedFiles（worktree-aware：含 merge-base 补齐与
 * working-tree），overlay 源 = 本变更 worktree 根（meta 感知；in-place 退主仓 cwd）——
 * 并行会话的在途文件物理不进快照。变更文档（changes/<name>/**，test_strategy 的
 * module-impact.md 等消费）从主仓 specBase 随快照复制。
 * @param {{ cwd: string, changeName: string, specBase: string, platformOpts?: object }} opts
 * @returns {Promise<{snapshotRoot: string, cleanup: () => void, overlaid: number, changeFileCount: number}|null>}
 */
export async function createVerifyGateSnapshot({ cwd, changeName, specBase, platformOpts = {} }) {
  try {
    const { resolveVerifyChangedFiles } = await import('../verify-postcheck.js')
    const { resolveRuntimeRoot } = await import('./shared.js')
    const { splitOwnVsForeignDiffFiles } = await import('../foreign-declared.js')
    let changeFiles = resolveVerifyChangedFiles(cwd, changeName, null, {
      specBase, includeWorkingTree: true,
    }) || []
    if (changeFiles.length === 0) return null // 无变更文件集 → 无从定向，回退主仓
    // 他者声明归属过滤（坑 verify-reconcile-foreign-wip 同款）：in-place 模式 working-tree
    // 并入后主仓全部在途文件进场——他者活跃变更显式声明的文件（quick --files / 他者 design
    // 清单）剔除，只留本变更相关面（无主文件保留，fail-closed 口径与 probe6 一致）。
    try {
      const runtimeRoot = resolveRuntimeRoot(platformOpts, specBase)
      const { foreign } = splitOwnVsForeignDiffFiles(cwd, changeName, changeFiles, { specBase, runtimeRoot })
      if (foreign.length > 0) {
        const foreignSet = new Set(foreign.map(x => x.file))
        changeFiles = changeFiles.filter(f => !foreignSet.has(f))
        if (changeFiles.length === 0) return null
      }
    } catch { /* 过滤失败退全量（fail-closed：宁可多 overlay 不漏本变更文件） */ }

    // overlay 源：worktree meta 感知（native worktree 在则从 worktree 根取「本变更分支内容」）
    let sourceRoot = null
    try {
      const { WorktreeManager } = await import('../worktree.js')
      const wm = new WorktreeManager({ cwd })
      const meta = wm.getMeta(changeName)
      if (meta && meta.worktreePath && meta.mode !== 'in-place-fallback' && existsSync(meta.worktreePath)) {
        sourceRoot = meta.worktreePath
      }
    } catch { /* meta 读取失败 → 主仓 cwd 源（files 已含本变更 working-tree 改动） */ }

    const snap = createGateSnapshot({ cwd, files: changeFiles, sourceRoot })
    if (!snap) return null

    // 变更文档随快照：module-impact.md（test_strategy=evidence-auto 消费）/tasks.md 等
    // 在 .sillyspec（gitignore）不进 HEAD，从主仓 specBase 复制 changes/<name>/**
    try {
      const changeDir = join(specBase, 'changes', changeName)
      if (existsSync(changeDir)) {
        const copyDir = (srcDir, dstDir) => {
          for (const e of readdirSync(srcDir, { withFileTypes: true })) {
            const s = join(srcDir, e.name); const d = join(dstDir, e.name)
            if (e.isDirectory()) { mkdirSync(d, { recursive: true }); copyDir(s, d) }
            else { mkdirSync(dirname(d), { recursive: true }); copyFileSync(s, d) }
          }
        }
        copyDir(changeDir, join(snap.snapshotRoot, '.sillyspec', 'changes', changeName))
      }
    } catch { /* 文档复制失败不连坐快照（test_strategy 降级 module 集仍可跑） */ }

    return { ...snap, changeFileCount: changeFiles.length, sourceRoot }
  } catch {
    return null // 任一链路异常 → 回退主仓现行为
  }
}
