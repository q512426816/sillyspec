/**
 * worktree-policy.js — worktree 守卫选择记忆（R16 减负批次，2026-09-24）
 *
 * 背景：worktree/apply 三处守卫（分支冲突三选一 / guard 相交三态 / 主仓脏树 stash）此前
 * 全是 fail-closed 抛错 + 文字菜单，选择只活在当次 flag 里不落任何配置——同一冲突下次
 * 原样重拦重问（对撞 R15 实证：无人值守跑批时这类重拦是纯摩擦轮）。
 *
 * 本模块读 local.yaml `worktree.policy` 段（js-yaml，best-effort 绝不抛）：
 *   adopt_branch:  true   → 分支已存在冲突时自动按「收编既有分支」处置（等效常备 --adopt-branch）
 *   apply_overlap: force | skip | manual（缺省 manual = 既有 fail-closed）
 *                          → guard 相交拦截的无人值守处置（force=放行留痕 / skip=软跳过）
 *   stash_dirty:   true   → 主仓脏树时自动 stash（等效常备 --stash-dirty）
 *
 * 另读 worktree 段平级键 `worktree.fallback`（2026-11-23-worktree-fallback-consent）：
 *   fallback: allow → git worktree add 失败时显式同意降级 in-place（等效常备 --allow-in-place，
 *   降级会 checkout 专用分支后主仓直写）；缺省/非法值 block = fail-closed 报错不降级
 *   （全历史唯一实锤事故 2026-07-15 证明静默降级是主分支污染风险，通道改同意制）。
 *
 * 优先级铁律：显式 flag > policy > fail-closed 缺省。policy 只消「重复选择」，不开新权限面
 * ——force/skip 经 policy 触发时同样落 overlapForced/overlapSkipped 留痕（审计可见）。
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import jsYaml from 'js-yaml'

/**
 * 读 worktree.policy 段 + 平级键 worktree.fallback。
 * @param {string} repoRoot - 主仓根（local.yaml 在 <repoRoot>/.sillyspec/local.yaml）
 * @returns {{ adoptBranch: boolean, applyOverlap: 'manual'|'force'|'skip', stashDirty: boolean, fallback: 'allow'|'block' }}
 *   文件缺/解析失败/段缺 → 全缺省（adoptBranch=false, applyOverlap='manual', stashDirty=false,
 *   fallback='block'）。两键独立：policy 段缺席不影响 worktree.fallback 读取，反之亦然。
 */
export function readWorktreePolicy(repoRoot) {
  const fallback = { adoptBranch: false, applyOverlap: 'manual', stashDirty: false, fallback: 'block' }
  try {
    const text = readFileSync(join(repoRoot, '.sillyspec', 'local.yaml'), 'utf8')
    const doc = jsYaml.load(text) || {}
    const wt = doc && doc.worktree
    const fallbackKey = wt && wt.fallback === 'allow' ? 'allow' : 'block'
    const policy = wt && wt.policy
    if (!policy || typeof policy !== 'object') return { ...fallback, fallback: fallbackKey }
    return {
      adoptBranch: policy.adopt_branch === true,
      applyOverlap: policy.apply_overlap === 'force' || policy.apply_overlap === 'skip' ? policy.apply_overlap : 'manual',
      stashDirty: policy.stash_dirty === true,
      fallback: fallbackKey,
    }
  } catch {
    return fallback
  }
}
