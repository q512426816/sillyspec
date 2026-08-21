/**
 * config-cat.js — local.yaml 实际值读取的权威路径解析器（`sillyspec config cat` 数据源）。
 *
 * 背景（2026-08-21 root-local-yaml 治理）：`config schema` 只列键不含值，agent 拿实际配置
 * 只能翻文件——worktree 内 `.sillyspec/` 是 checkout 副本，gitignored 的 local.yaml 不随
 * checkout 出现，agent 找不到就漂去项目根乱找甚至乱建。cat 按「文件存在」解析真实路径，
 * agent 不需要知道文件在哪。
 *
 * 候选链（首个「文件存在」者胜）：
 * 1. specBase（--spec-dir / 平台 pointer / resolveSpecDir 祖先链首个 .sillyspec 目录）——
 *    resolveSpecDir 按「目录存在」命中，worktree 内会停在副本目录，文件并不在那里；
 * 2. cwd 祖先链逐级 <dir>/.sillyspec/local.yaml——worktree 副本无此文件会继续向上命中主仓
 *    （sillyspec worktree 恒挂在 <主仓>/.sillyspec/.runtime/worktrees/ 下，祖先链必达）；
 * 3. git common-dir 反推主仓根——用户手动 `git worktree add` 到任意位置时的兜底。
 *
 * 候选链不含项目根 <dir>/local.yaml——那里从来没有这个文件（hook 同步拦写）。
 * 纯只读；平台 pointer 异常由调用方吞掉走祖先链（真实 reader 各自 fail-closed，cat 是
 * 只读便利口，不必加重）。
 */
import { existsSync } from 'fs'
import { join, resolve, dirname } from 'path'
import { gitQuiet } from './git-helper.js'

/**
 * 解析真实 local.yaml 路径。
 * @param {string} dir 起点目录（CLI --dir / cwd）
 * @param {{ specBase?: string|null }} [opts] specBase = resolvePlatformSpecDir 预解析结果（可 null）
 * @returns {{ exists: boolean, path: string|null, source: string|null, searched: string[] }}
 *   searched 为候选链前几个路径（未命中时供人看「找过哪里」，最多 6 条）
 */
export function resolveLocalYaml(dir, opts = {}) {
  const start = resolve(dir || process.cwd())
  const seen = new Set()
  const candidates = []
  const push = (p, source) => {
    const key = resolve(p)
    if (seen.has(key)) return
    seen.add(key)
    candidates.push({ path: key, source })
  }

  if (opts.specBase) push(join(opts.specBase, 'local.yaml'), 'spec 根（--spec-dir/平台 pointer/最近 .sillyspec）')
  for (let d = start; ; d = dirname(d)) {
    push(join(d, '.sillyspec', 'local.yaml'), 'cwd 祖先链（worktree 内向上命中主仓）')
    const parent = dirname(d)
    if (parent === d) break
  }
  // git 兜底：linked worktree 内 --git-common-dir 指向主仓共享 .git，dirname 即主仓根
  const commonDir = gitQuiet(start, ['rev-parse', '--git-common-dir'])
  if (commonDir) {
    const mainRoot = dirname(resolve(start, String(commonDir).trim()))
    push(join(mainRoot, '.sillyspec', 'local.yaml'), 'git common-dir 反推主仓根')
  }

  const hit = candidates.find(c => existsSync(c.path))
  return {
    exists: !!hit,
    path: hit ? hit.path : null,
    source: hit ? hit.source : null,
    searched: candidates.slice(0, 6).map(c => c.path),
  }
}

/**
 * 写侧目标解析（`sillyspec local register-repo` 用）：已存在 local.yaml → 就地更新该文件
 * （含 worktree → 主仓解析）；全不存在 → 取 specBase（或 cwd 链）候选，但候选落在 worktree
 * 副本下（<主仓>/.sillyspec/.runtime/worktrees/ 内）时重定向 git common-dir 主仓根——
 * local.yaml 是 gitignored 不随 worktree checkout，写进副本目录是死配置。
 *
 * @param {string} dir 起点目录
 * @param {{ specBase?: string|null }} [opts]
 * @returns {{ path: string, existed: boolean }}
 */
export function resolveLocalYamlWriteTarget(dir, opts = {}) {
  const r = resolveLocalYaml(dir, opts)
  if (r.exists) return { path: r.path, existed: true }
  const start = resolve(dir || process.cwd())
  const preferred = opts.specBase ? join(opts.specBase, 'local.yaml') : join(start, '.sillyspec', 'local.yaml')
  const posix = resolve(preferred).replace(/\\/g, '/')
  if (posix.includes('/.sillyspec/.runtime/worktrees/')) {
    const commonDir = gitQuiet(start, ['rev-parse', '--git-common-dir'])
    if (commonDir) {
      const mainRoot = dirname(resolve(start, String(commonDir).trim()))
      return { path: join(mainRoot, '.sillyspec', 'local.yaml'), existed: false }
    }
  }
  return { path: resolve(preferred), existed: false }
}
