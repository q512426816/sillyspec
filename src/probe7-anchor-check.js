/**
 * probe7-anchor-check.js — verify-result.md 探针7 矩阵 covered 行证据锚点校验（零环新模块）。
 *
 * 坑 probe7-covered-anchor-missing（2026-09-15 复盘实证：探针7 矩阵第一轮 7 行 covered 判定的
 * 证据列缺 file:line 锚点被审查打回——预填说明写着「证据列给首命中 file:line 锚点」但模板要求
 * 没细读就交，人工往返一轮）。本模块把该口径机器化：verify --done 时点解析正文探针7 段，
 * 判定列=covered 的行必须含 `path:line` 形态锚点，缺则 advisory 提示回补。
 *
 * 定位与边界：
 * - **advisory 不阻断**：covered 行缺锚点只 warn（证据可以是合法的人工核验形态，但 covered=
 *   有归属测试命中，锚点理应存在——缺锚点大概率是 agent 改写预填时丢了，回补成本低）。
 * - 只查 covered：partial/uncovered/non-testable 的证据形态多样（人工核验提示/理由），不做
 *   锚点要求（误报面大于收益）。
 * - 独立模块而非长在 verify-probes.js：后者是多会话高频冲突面（探针3/5 家族改动多发），
 *   本校验只消费 verify-result.md 文本，零依赖单文件最稳。
 * - 表格列序与 renderProbe7Lines 骨架同源锚定：| acceptance | 归属测试 | 关键词命中 | 判定 | 证据 |
 *   → split('|') 后 cells[4]=判定、cells[5]=证据（首尾空串偏移）。
 */

// file:line 锚点：冒号后跟数字（`test/x.test.mjs:42`、`src/a.py:12-18` 均命中）
const ANCHOR_RE = /:\d+\b/

// 判定枚举纯值（骨架四枚举；容忍反引号包裹——门禁层 extractAcceptanceMatrixSlots 另有纯值校验）
function normalizeVerdict(cell) {
  return String(cell || '').trim().replace(/^`|`$/g, '').toLowerCase()
}

/**
 * 校验探针7 矩阵 covered 行的证据锚点。
 * @param {string} reportText verify-result.md 全文
 * @returns {{applicable:boolean, rowsChecked:number, coveredRows:number,
 *   missingAnchors:Array<{task:string, acceptance:string, evidence:string}>}}
 *   applicable=false：正文无「#### 探针 7」段（quick/存量报告）——调用方零输出。
 */
export function checkProbe7AnchorCoverage(reportText) {
  const out = { applicable: false, rowsChecked: 0, coveredRows: 0, missingAnchors: [] }
  if (!reportText) return out
  const lines = String(reportText).replace(/\r\n/g, '\n').split('\n')
  const start = lines.findIndex(l => /^####\s*探针\s*7/.test(l))
  if (start === -1) return out
  let end = lines.length
  for (let i = start + 1; i < lines.length; i++) {
    if (/^####\s/.test(lines[i])) { end = i; break }
  }
  out.applicable = true
  let task = null
  for (let i = start + 1; i < end; i++) {
    const line = lines[i]
    const tm = line.match(/^\*\*(.+?)\*\*\s*$/)
    if (tm) { task = tm[1].trim(); continue }
    if (!line.startsWith('|')) continue
    const cells = line.split('|').map(c => c.trim())
    if (cells.length < 6) continue // 表头/分隔行之外的畸形行不参与（表头 6 列含首尾空串）
    const verdict = normalizeVerdict(cells[4])
    if (!['covered', 'partial', 'uncovered', 'non-testable'].includes(verdict)) continue
    out.rowsChecked++
    if (verdict !== 'covered') continue
    out.coveredRows++
    const evidence = cells[5] || ''
    if (!ANCHOR_RE.test(evidence)) {
      out.missingAnchors.push({
        task: task || '(未知 task)',
        acceptance: (cells[1] || '').slice(0, 80),
        evidence: evidence.slice(0, 80),
      })
    }
  }
  return out
}
