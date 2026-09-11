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

    // 环境目录链接（坑 gate-snapshot-env-mismatch，2026-09-12 驾驭第十三批③，用户实证：
    // 沙箱实测 venv 不装 dev 依赖（xdist 缺失）+ node_modules 缺失——快照只链 node_modules 时
    // Python 项目的 commands.test 在快照内找不到 venv，误伤持续且难归因）。链接面扩 venv 族
    // （.venv/venv/env——链接后 dev 依赖与主仓同源，不缺 xdist）；链接失败/主仓本就没有时
    // ⚠️ 显式可见（环境不一致的门禁会持续误伤——宁可吵不可静默错）。
    // 递归依赖发现（坑 gate-snapshot-monorepo-layout，2026-09-12 驾驭第十五批①，用户实证
    // 「对 monorepo 依赖布局完全不可用，四次重试才定位」）：pnpm/nx/lerna workspace 的
    // packages/<pkg>/node_modules 子目录依赖不在根四目录——深度≤3 扫描发现集逐个 junction。
    const envRelDirs = discoverEnvDirs(cwd)
    for (const rel of envRelDirs) {
      const src = join(cwd, rel)
      const dst = join(snapshotRoot, rel)
      try {
        mkdirSync(dirname(dst), { recursive: true })
        symlinkSync(src, dst, 'junction')
      } catch (e) {
        console.warn(`⚠️ 门禁快照环境目录链接失败（${rel}）：${e && e.message ? e.message : e}——快照内实测可能因缺该目录误伤，失败时先核对快照环境`)
      }
    }
    if (envRelDirs.length === 0) {
      console.warn(`⚠️ 门禁快照：主仓未发现任何环境目录（node_modules / venv 族，含子包递归）——commands.test/lint 若依赖它们将快照/主仓都不可用（环境未安装？）`)
    }

    // 环境完整性预检（坑 gate-snapshot-env-mismatch 二阶，2026-09-12 驾驭第十四批①，用户
    // 实证「verify lint 沙箱必挂 node_modules 缺失只能 advisory」）：主仓存在某环境目录而
    // 快照内缺失（链接失败/布局差异）→ 快照对该仓 commands 是假环境，实测必挂——快照作废
    // 回退主仓现行为（主仓口径可能被并行脏文件污染，但环境真实；两害取轻 + 回退原因可见）。
    const envMissing = envDirsLinked(cwd, snapshotRoot)
    if (envMissing.length > 0) {
      console.warn(`⚠️ 门禁快照环境不完整（${envMissing.join('、')} 在主仓存在、快照内缺失）——快照作废回退主仓实测（宁可主仓口径不可假沙箱硬挂；回退后失败先做污染归属鉴定）`)
      try { git(cwd, ['worktree', 'remove', '--force', '--quiet', snapshotRoot]) } catch {}
      try { rmSync(snapshotRoot, { recursive: true, force: true }) } catch {}
      return null
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


/** 环境目录名集（根与子包通用） */
const ENV_DIR_NAMES = new Set(['node_modules', '.venv', 'venv', 'env'])

/**
 * 递归依赖发现（坑 gate-snapshot-monorepo-layout）：深度 ≤3 扫描（跳过环境目录自身内部/
 * .git/dist/build/.sillyspec），返回所有环境目录的仓库根相对 POSIX 路径（含根级四目录）。
 * pnpm/nx/lerna workspace 的 packages/<pkg>/node_modules 覆盖。
 */
export function discoverEnvDirs(cwd, { maxDepth = 3 } = {}) {
  const out = []
  const skip = new Set(['.git', 'dist', 'build', '.sillyspec', 'out', 'target'])
  const walk = (dir, rel, depth) => {
    let entries
    try { entries = readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      if (!e.isDirectory() || skip.has(e.name)) continue
      const childRel = rel ? rel + '/' + e.name : e.name
      if (ENV_DIR_NAMES.has(e.name)) {
        out.push(childRel)
        continue // 环境目录内部不再下钻（node_modules/node_modules 无意义且巨大）
      }
      if (depth < maxDepth) walk(join(dir, e.name), childRel, depth + 1)
    }
  }
  walk(cwd, '', 0)
  return out
}

/**
 * 环境完整性纯检（坑 gate-snapshot-env-mismatch 二阶，发现集口径）：主仓存在（递归发现）
 * 而快照缺失的环境目录清单。任一命中 = 快照对该仓 commands 是假环境，调用方作废回退主仓。
 * @returns {string[]} 缺失目录相对路径（空数组 = 完整/主仓本就无环境目录）
 */
export function envDirsLinked(cwd, snapshotRoot) {
  const missing = []
  for (const rel of discoverEnvDirs(cwd)) {
    try {
      if (existsSync(join(cwd, rel)) && !existsSync(join(snapshotRoot, rel))) missing.push(rel)
    } catch { missing.push(rel) /* 判定异常按缺失算（保守作废快照） */ }
  }
  return missing
}

/**
 * 快照内实测失败的归属提示（坑 gate-snapshot-monorepo-layout 配套：用户四次重试才从日志
 * 摸到 Temp\sillyspec-gate-* 路径——失败时路径/疑点/对照复跑出口必须直给）。
 * 调用方在「快照内执行且失败」的分支打印。
 */
export function printSnapshotFailureHint(snapInfo, { offEnv = 'SILLYSPEC_VERIFY_GATE_SNAPSHOT_OFF' } = {}) {
  if (!snapInfo || !snapInfo.snapshotRoot) return
  console.error(`   🔬 本次实测执行于隔离快照：${snapInfo.snapshotRoot}（HEAD + 本变更 ${snapInfo.changeFileCount ?? '?'} 个文件${snapInfo.sourceRoot ? '，overlay 自 worktree' : ''}）`)
  console.error(`   失败疑点排查顺序：① 本变更文件自身的真实失败（最常见）→ 修代码；② 快照环境差异（monorepo 依赖布局/环境目录链接缺失）→ 设 ${offEnv}=1 回退主仓复跑对照——主仓过而快照挂即环境问题；③ 并行污染已被快照隔离，不在疑点内。`)
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
