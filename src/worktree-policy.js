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
 * 优先级铁律：显式 flag > policy > fail-closed 缺省。policy 只消「重复选择」，不开新权限面
 * ——force/skip 经 policy 触发时同样落 overlapForced/overlapSkipped 留痕（审计可见）。
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import jsYaml from 'js-yaml'

/**
 * 读 worktree.policy 段。
 * @param {string} repoRoot - 主仓根（local.yaml 在 <repoRoot>/.sillyspec/local.yaml）
 * @returns {{ adoptBranch: boolean, applyOverlap: 'manual'|'force'|'skip', stashDirty: boolean }}
 *   文件缺/解析失败/段缺 → 全缺省（adoptBranch=false, applyOverlap='manual', stashDirty=false）。
 */
export function readWorktreePolicy(repoRoot) {
  const fallback = { adoptBranch: false, applyOverlap: 'manual', stashDirty: false }
  try {
    const text = readFileSync(join(repoRoot, '.sillyspec', 'local.yaml'), 'utf8')
    const doc = jsYaml.load(text) || {}
    const policy = doc && doc.worktree && doc.worktree.policy
    if (!policy || typeof policy !== 'object') return fallback
    return {
      adoptBranch: policy.adopt_branch === true,
      applyOverlap: policy.apply_overlap === 'force' || policy.apply_overlap === 'skip' ? policy.apply_overlap : 'manual',
      stashDirty: policy.stash_dirty === true,
    }
  } catch {
    return fallback
  }
}
