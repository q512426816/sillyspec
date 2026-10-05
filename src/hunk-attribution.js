/**
 * hunk-attribution —— 提交面行级归属门（2026-09-27-hunk-attribution-gate）。
 *
 * 背景事故（本仓 4f859053 实证）：两个会话并发编辑同一文件，文件级 pathspec 提交把并行
 * 会话 25 行在途代码夹带进冻结面——规则 11 的文件级对账防「别的文件」，防不住「同一文件
 * 里别人的行」。用户裁决：不默认挂工作树（合并税过重，wt-parallel-commit-race 等坑史为
 * 证），改为把对账升到 hunk 级归属门。
 *
 * 三类信号（诚实口径：机器无法判定「哪行是谁的」，门的目标是把静默混合变成显式中断）：
 *   ① 未归因文件：提交面文件不在本变更声明面（design 清单 ∪ requirements 测试绑定，
 *      复用 parseFileChangeList / extractRequirementBindings / testAnchorFile 同源解析）；
 *      其中「窗口内全部提交均属他侧变更名」的文件改判他侧归因（提交事实，2026-10-05-
 *      hunk-gate-commit-attribution：归档他侧变更声明面不可见致误报——信息行不计数 ok 面）；
 *   ② 跨变更竞争：其他活跃变更的声明面与提交面相交——同文件无法按行归属，显式列出
 *      竞争文件、对方变更名与 hunk 数，收口前人工核对；
 *   ③ 在途残留：提交面文件当前工作树仍有未提交 diff——活跃并发 WIP 信号。
 *
 * 分级：local.yaml hunk_gate（warn 默认 / error / off）。error 档由接线方（flow.js probes
 * 子步）阻断收口；本模块只产结果不执法。fail-soft：非 git 环境与异常降级跳过。
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

/** local.yaml 读 hunk_gate（warn|error|off，默认 warn；CRLF 容错）。 */
export function readHunkGate(specBase) {
  try {
    const raw = readFileSync(join(specBase, 'local.yaml'), 'utf8')
    const m = raw.match(/^\s*hunk_gate\s*:\s*['\"]?(warn|error|off)['\"]?\s*$/m)
    return m ? m[1] : 'warn'
  } catch {
    return 'warn'
  }
}

function normalizePath(p) {
  return String(p).replace(/^NEW:\s*/, '').replace(/\\/g, '/').trim()
}

/**
 * 本变更声明面（design 清单 ∪ requirements 测试绑定路径）。解析器与 flow done 既有
 * 「提交面夹带嫌疑 advisory」同源（不二算口径一致）。
 * @returns {{ declared: Set<string>, parseFailed: boolean }}
 */
export async function collectDeclaredFace(changeDir, change) {
  const declared = new Set()
  let parseFailed = false
  try {
    const { parseFileChangeList } = await import('./change-list.js')
    for (const p of parseFileChangeList(join(changeDir, 'design.md'))) declared.add(normalizePath(p))
  } catch { parseFailed = true }
  try {
    const { extractRequirementBindings } = await import('./flow-draft.js')
    const { testAnchorFile } = await import('./test-bindings.js')
    for (const row of extractRequirementBindings({ changeDir, change })) {
      for (const t of row.tests || []) declared.add(normalizePath(testAnchorFile(t)))
    }
  } catch { parseFailed = true }
  return { declared, parseFailed }
}

/** 其他活跃变更的声明面（排除 archive 与本变更；design 缺失的变更跳过）。 */
async function collectForeignDeclarations(specBase, changeName) {
  const map = new Map() // file -> Set<changeName>
  const changesRoot = join(specBase, 'changes')
  let dirs
  try { dirs = readdirSync(changesRoot, { withFileTypes: true }) } catch { return map }
  const { parseFileChangeList } = await import('./change-list.js')
  for (const d of dirs) {
    if (!d.isDirectory()) continue
    if (d.name === 'archive' || d.name === changeName) continue
    const designPath = join(changesRoot, d.name, 'design.md')
    if (!existsSync(designPath)) continue
    try {
      for (const p of parseFileChangeList(designPath)) {
        const f = normalizePath(p)
        if (!map.has(f)) map.set(f, new Set())
        map.get(f).add(d.name)
      }
    } catch { /* 单变更解析失败跳过（fail-soft） */ }
  }
  return map
}

/** 数某文件 baseline..HEAD 的 hunk 数（二进制/重命名无 @@ 头计 0——按文件级处理）。 */
function countHunks(gitFn, cwd, baselineCommit, file) {
  try {
    const out = gitFn(cwd, ['diff', `${baselineCommit}..HEAD`, '--', file])
    const text = String(out || '')
    let n = 0
    for (const line of text.split('\n')) if (line.startsWith('@@')) n++
    return n
  } catch {
    return -1
  }
}

/** 当前工作树未提交修改文件集（M 状态；新增未跟踪不算——residue 只关心已提交文件的并发改动）。 */
function collectWorkingTreeModified(gitFn, cwd) {
  try {
    const out = gitFn(cwd, ['status', '--porcelain'])
    const set = new Set()
    for (const line of String(out || '').split('\n')) {
      const status = line.slice(0, 2)
      const path = normalizePath(line.slice(3).split(' -> ').pop())
      // porcelain XY 双列：X=暂存位 Y=工作树位（" M a.js" 是未暂存修改）——任一列 M/A 都算在途
      if ((status[0] === 'M' || status[0] === 'A' || status[1] === 'M' || status[1] === 'A') && path) set.add(path)
    }
    return set
  } catch {
    return null
  }
}

/**
 * 行级归属门主体。committedFiles 为 baseline..HEAD 提交面文件清单（相对路径正斜杠）。
 * @returns {{ ok: boolean, degraded: boolean, gate: string, unattributed: Array,
 *   contended: Array, residue: Array, notes: string[] }}
 */
export async function runHunkAttributionGate({ cwd, specBase, changeName, baselineCommit, committedFiles, gitFn, gate = 'warn' }) {
  const result = { ok: true, degraded: false, gate, faceCount: 0, unattributed: [], foreignByCommit: [], contended: [], residue: [], notes: [] }
  if (gate === 'off') {
    result.notes.push('hunk_gate=off——归属门关闭')
    return result
  }
  if (!baselineCommit || !Array.isArray(committedFiles) || committedFiles.length === 0) {
    result.notes.push('提交面为空或基线缺失——归属门跳过')
    return result
  }
  const changeDir = join(specBase, 'changes', changeName)
  const { declared } = await collectDeclaredFace(changeDir, changeName)

  const deliverables = committedFiles
    .map(normalizePath)
    .filter((f) => !f.startsWith('.sillyspec/'))
  result.faceCount = deliverables.length

  // ① 未归因文件（声明面全空时降为提示，不指认夹带——advisory 同口径）
  if (declared.size > 0) {
    const undeclared = deliverables.filter((f) => !declared.has(f))
    // 他侧归因改判（提交事实，2026-10-05-hunk-gate-commit-attribution）：collectForeignDeclarations
    // 只扫活跃变更（排 archive/）——归档他侧交付落本窗口时报「未归因」，指引「pathspec 隔离/
    // 补 design 自声明」双误导（F-4 实证：他侧 546720ea 已归档交付被指为在途）。按提交 message
    // 变更名归属（commitAttributionForChange+isForeignByCommit，与 patch 冻结 filterCommittedFace
    // 同源）：窗口内全部提交均属他侧变更名 → 他侧归因（ℹ️ 信息行、不计 ok 阻断面）；
    // 裸提交/本变更名提交触碰的文件保持未归因（fail-closed 原口径）。切分不可得（非 git/
    // git 失败 → null）保持全量未归因，不放宽。
    let attr = null
    let isForeign = null
    try {
      const m = await import('./foreign-declared.js')
      attr = m.commitAttributionForChange(cwd, specBase, changeName, baselineCommit)
      isForeign = m.isForeignByCommit
    } catch { /* 同源切分不可得 → 原口径 */ }
    for (const f of undeclared) {
      const entry = attr ? attr.get(f) : null
      if (isForeign && isForeign(entry, changeName)) {
        result.foreignByCommit.push({ file: f, owners: [...entry.owners] })
      } else {
        result.unattributed.push({ file: f, hunks: countHunks(gitFn, cwd, baselineCommit, f) })
      }
    }
  } else {
    result.notes.push('本变更无文件声明面（design 无清单、requirements 无绑定）——未归因判定降为提示')
  }

  // ② 跨变更竞争（同文件无法按行归属——显式暴露）
  const foreign = await collectForeignDeclarations(specBase, changeName)
  for (const f of deliverables) {
    const by = foreign.get(f)
    if (by && by.size > 0) {
      result.contended.push({ file: f, by: [...by], hunks: countHunks(gitFn, cwd, baselineCommit, f) })
    }
  }

  // ③ 在途残留（提交面文件当前仍有未提交修改——活跃并发 WIP）
  const modified = collectWorkingTreeModified(gitFn, cwd)
  if (modified) {
    for (const f of deliverables) {
      if (modified.has(f)) result.residue.push({ file: f })
    }
  }

  result.ok = result.unattributed.length === 0 && result.contended.length === 0
  return result
}

/** 渲染（warn/error 由接线方选择输出流；本函数只产行）。 */
export function renderHunkAttributionLines(r) {
  const L = []
  if (!r || r.gate === 'off' || r.degraded) {
    L.push(`- 不适用（${r && r.gate === 'off' ? 'hunk_gate=off' : '降级跳过（非 git 环境或异常）'}）`)
    for (const n of (r && r.notes) || []) L.push(`- ℹ️ ${n}`)
    return L
  }
  const attributed = r.faceCount - r.unattributed.length - (r.foreignByCommit || []).length
  L.push(`- ℹ️ 提交面 ${r.faceCount} 个交付文件对账：声明面归因 ${attributed}、他侧归因（提交事实）${(r.foreignByCommit || []).length}、未归因 ${r.unattributed.length}、跨变更竞争 ${r.contended.length}、在途残留 ${r.residue.length}`)
  for (const fb of (r.foreignByCommit || [])) {
    L.push(`- ℹ️ 他侧归因（提交事实）：\`${fb.file}\` 窗口提交全部属 ${fb.owners.join('、')}——已归档他侧交付非本变更未归因，patch 冻结面同口径剔除`)
  }
  for (const u of r.unattributed) {
    L.push(`- ⚠️ 未归因：\`${u.file}\`（${u.hunks >= 0 ? `${u.hunks} hunk` : 'hunk 数不可得'}）不在 design 清单与 requirements 测试绑定——属并行会话在途交付则须显式 pathspec 隔离并协调归属；属本变更则补 design 自声明`)
  }
  for (const c of r.contended) {
    L.push(`- ⚠️ 跨变更竞争：\`${c.file}\` 同时被活跃变更 ${c.by.join('、')} 声明（${c.hunks >= 0 ? `${c.hunks} hunk` : '?'}）——同文件无法按行归属，收口前逐 hunk 核对全部改动确属本变更，否则协调串行或拆分提交`)
  }
  for (const s of r.residue) {
    L.push(`- ⚠️ 在途残留：\`${s.file}\` 已进提交面但当前工作树仍有未提交修改——活跃并发 WIP 信号，确认无 interleaved 提交风险`)
  }
  if (r.unattributed.length === 0 && r.contended.length === 0 && r.residue.length === 0) {
    L.push('- ✅ 提交面全部文件归属清晰（声明面覆盖、无跨变更竞争、无在途残留）')
  }
  for (const n of r.notes || []) L.push(`- ℹ️ ${n}`)
  return L
}
