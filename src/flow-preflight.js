/**
 * flow-preflight.js — 收口预检（fail-together 一次报全，2026-10-23-flow-done-preflight）
 *
 * 背景（收口画像实证）：621 次 flow done 调用/255 变更=2.44 次/变更，净浪费 152 次 RTT（24.5%）
 * 源于逐门 fail-fast 串行拒绝；dirty-gap 门在实测门之后——56% 触发率的门每次拦截都先付一轮
 * 完整实测（58s 起、大仓分钟级）。
 *
 * 本模块是纯前移报告层：实测门前只读收集「独立可算的便宜阻断条件」，由 flow.js 侧渲染一次
 * 报全后拦在付费实测之前。判定与权威门同源同判定（复用同一批函数而非重写），旗标与守卫
 * 逐条镜像 patch 子步：
 *   - dirty-gap 预判镜像 collectFreezeFiles dirtyWarned 非空 && !freezeDirty && !acceptDirtyGap
 *     && !turbo（turbo 下权威门降 advisory，镜像不拦）
 *   - orphan-face 预判镜像仅会话独占 worktree（shouldSkipGateSnapshotForWorktree）且
 *     !acceptOrphanFace
 *   - 守卫：baseline 缺席跳过（patch 子步整体跳过面）；patch 子步已 done 跳过——预检绝不
 *     重复拦已过权威门的面（断点续不误拦）
 *
 * 放弃项（评审已裁决，见 design 风险与死路）：review.json schema 预验不做——schema 违规的
 * 成本是「修正文件+重跑」一轮 RTT，与检测时点无关（同轮提前检测不省轮次）；且豁免轮
 * （--no-review）权威门不读文件，预检先验会多拦权威门不拦的面（判定漂移），三路皆负。
 *
 * fail-safe 单向：预检异常静默放行（返回空 findings）——漏报由权威门兜底（仍在原子步原序），
 * 预检不构成新失败面；全程零写盘（不落冻结件、不 mark 子步、不写 flow-state）。
 */
import { gitQuiet } from './git-helper.js'

/**
 * 收集收口预检阻断条件（纯计算零打印）。
 * @returns {{ findings: Array<{id:'dirty-gap',count:number,files:string[]} | {id:'orphan-face',commits:string[],count:number,files:string[]}> }}
 */
export async function collectCloseoutPreflight({ cwd, specBase, change, st, freezeDirty = false, acceptDirtyGap = false, acceptOrphanFace = false, turbo = false }) {
  const findings = []
  const patchDone = st?.substeps?.patch === 'done'
  // ── dirty-gap / orphan-face 预判（镜像 patch 子步判定链）──
  if (!patchDone && st?.baseline_commit) {
    try {
      let exclusiveFrom = freezeDirty === true ? 'flag' : null
      if (exclusiveFrom == null) {
        try {
          const { shouldSkipGateSnapshotForWorktree } = await import('./run/gate-snapshot.js')
          if (shouldSkipGateSnapshotForWorktree(cwd)) exclusiveFrom = 'worktree'
        } catch { /* 判定异常按共享主仓（权威门同款） */ }
      }
      const exclusive = exclusiveFrom != null
      const committedRaw = String(gitQuiet(cwd, ['diff', '--name-only', `${st.baseline_commit}..HEAD`]) || '')
        .split('\n').map((s) => s.trim().replace(/\\/g, '/')).filter(Boolean)
      const { filterCommittedFace, collectFreezeFiles, scanOrphanFace } = await import('./flow-parity.js')
      const ownPrefix = `.sillyspec/changes/${change}/`
      const committed = filterCommittedFace(committedRaw, ownPrefix)
      const freeze = collectFreezeFiles({ cwd, specBase, change, committed, exclusive })
      if (freeze.dirtyWarned.length > 0 && !freezeDirty && !acceptDirtyGap && !turbo) {
        findings.push({ id: 'dirty-gap', count: freeze.dirtyWarned.length, files: freeze.dirtyWarned })
      }
      if (exclusiveFrom === 'worktree' && !acceptOrphanFace) {
        try {
          const orphan = scanOrphanFace(cwd, { baseline: st.baseline_commit })
          if (orphan.files.length > 0) {
            findings.push({ id: 'orphan-face', commits: orphan.commits, count: orphan.files.length, files: orphan.files })
          }
        } catch { /* orphan 预判 fail-safe（权威门同款不阻断） */ }
      }
    } catch { /* 预检 fail-safe：异常静默放行（权威门仍在 patch 子步原序原判定） */ }
  }
  return { findings }
}

export default { collectCloseoutPreflight }
