/**
 * flow-parity.js — 薄道资产对齐三件（2026-09-25-thin-parity-assets，能力/资产对照表终核收口）。
 *
 * ① reconcileModuleDocs：模块文档同步对账——厚道 module-impact 死信门的薄道等价物（advisory）：
 *    交付文件命中模块图 → 点名模块与文档路径；模块代码变了而文档未动 → 强提示。模块文档是
 *    后续变更 module 命中/门禁收窄/知识注入的原料（verify -68% 那笔账的来源），失供是复利折旧。
 * ② renderVerifyReceipt：verify-result 机器回执——人类可读收口结论（实测面/评审/绑定/冻结 sha），
 *    厚道有薄道缺的审计资产；机器合成勿手改。
 * ③ harvestSlot4Decision：design 槽4（风险与死路）实质作答收割合成 decisions.md——薄变更决策
 *    产出为零的补口（死路与风险取舍正是 decisions.md 该记的内容；已有文件不覆盖）。
 */
import { existsSync, readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import yaml from 'js-yaml'
import { writeAtomicSync } from './fs-atomic.js'

/** 找模块图：.sillyspec/docs/<project>/modules/_module-map.yaml（首个命中；内部面）。 */
function findModuleMapFile(specBase) {
  try {
    const docsDir = join(specBase, 'docs')
    for (const proj of readdirSync(docsDir)) {
      const p = join(docsDir, proj, 'modules', '_module-map.yaml')
      if (existsSync(p)) return { mapPath: p, project: proj }
    }
  } catch { /* 无 docs 结构 → 无对账面 */ }
  return null
}

/**
 * 模块文档对账（advisory）。@param ownFiles 交付文件（posix）；@param committedRaw 含 .sillyspec 的原始提交面
 * （模块文档在 .sillyspec/docs/ 下，交付面过滤会剔除——文档是否更新需查原始提交面）。
 * @returns {{lines: string[], hits: number}} lines 为空=无命中零输出。
 */
export function reconcileModuleDocs({ specBase, ownFiles, committedRaw }) {
  const found = findModuleMapFile(specBase)
  if (!found) return { lines: [], hits: 0 }
  let map
  try { map = yaml.load(readFileSync(found.mapPath, 'utf8')) } catch { return { lines: [], hits: 0 } }
  if (!map || typeof map !== 'object') return { lines: [], hits: 0 }
  const deliverables = new Set((ownFiles || []).map((f) => String(f).replace(/\\/g, '/')))
  const committed = new Set((committedRaw || []).map((f) => String(f).replace(/\\/g, '/')))
  const lines = []
  let hits = 0
  for (const [modId, mod] of Object.entries(map)) {
    if (!mod || typeof mod !== 'object') continue
    const paths = Array.isArray(mod.paths) ? mod.paths : []
    const hitFiles = paths.filter((pp) => {
      const norm = String(pp).replace(/\\/g, '/')
      return [...deliverables].some((f) => f === norm || f.startsWith(norm.endsWith('/') ? norm : norm + '/'))
    })
    if (hitFiles.length === 0) continue
    hits++
    const docRel = mod.doc ? `docs/${found.project}/${String(mod.doc).replace(/^modules\//, 'modules/')}` : null
    const docAbs = docRel ? join(specBase, docRel) : null
    const docTouched = docAbs ? [...committed].some((f) => f.replace(/\\/g, '/') === docRel) : false
    if (docTouched) lines.push(`   ✓ ${modId}（${hitFiles.length} 文件）——文档 ${docRel} 已同步`)
    else lines.push(`   ⚠️ ${modId}（${hitFiles.length} 文件）——文档${docAbs && existsSync(docAbs) ? ` ${docRel} ` : '（缺失）'}未随变更更新：若行为/接口有变请先补文档（模块文档是后续变更门禁收窄与知识注入的原料）`)
  }
  if (hits > 0) {
    return {
      lines: [`📎 模块文档对账（advisory）：交付面命中 ${hits} 个模块——`, ...lines],
      hits,
    }
  }
  return { lines: [], hits: 0 }
}

/**
 * verify-result 机器回执（归档前合成，随变更目录留档）。
 */
export function renderVerifyReceipt({ change, baseline, head, gateSummary, review, traceCount, patchMeta, generatedAt }) {
  const sha = patchMeta && patchMeta.patchSha256 ? patchMeta.patchSha256.slice(0, 12) : null
  const reviewLine = review
    ? review.verdict === 'exempt'
      ? '豁免（低风险证据齐全' + (review.sampled ? '' : '') + '）'
      : `${review.verdict}（reviewer 见 review.json${Number.isFinite(review.findingsP1) ? `，P1 ${review.findingsP1}` : ''}）`
    : '—'
  return [
    `---`,
    `author: flow-machine-draft`,
    `created_at: ${generatedAt}`,
    `---`,
    `# 验证回执（flow）— ${change}`,
    ``,
    `- **结论**：PASS（flow done 2/2 协议调用收口）`,
    `- **基线..HEAD**：${baseline ? baseline.slice(0, 10) : '?'}..${head ? head.slice(0, 10) : '?'}`,
    `- **实测面**：${gateSummary || '—'}`,
    `- **独立评审**：${reviewLine}`,
    `- **测试绑定**：${traceCount > 0 ? `${traceCount} 行（test-trace.json，已随发号提升）` : '0（无锚行）'}`,
    `- **交付冻结**：${sha ? `change.patch（sha256 ${sha}…）` : '（无冻结件）'}`,
    `- **生成**：${generatedAt}（机器合成，勿手改；明细见 flow-telemetry.jsonl / change-patch.json）`,
    ``,
  ].join('\n')
}

/**
 * design 槽4（风险与死路）实质作答收割 → decisions.md（已有不覆盖）。
 * @returns {{harvested: boolean, reason?: string}}
 */
export function harvestSlot4Decision({ changeDir, change }) {
  const decPath = join(changeDir, 'decisions.md')
  if (existsSync(decPath)) return { harvested: false, reason: 'decisions.md 已在场（不覆盖）' }
  let dText
  try { dText = readFileSync(join(changeDir, 'design.md'), 'utf8') } catch { return { harvested: false, reason: '无 design.md' } }
  const lines = dText.replace(/\r\n/g, '\n').split('\n')
  let inSlot = false
  const buf = []
  for (const line of lines) {
    if (/^<!--\s*AGENT:槽4/.test(line)) { inSlot = true; continue }
    if (inSlot && (/^<!--/.test(line) || /^#{1,6}\s/.test(line))) break
    if (inSlot) buf.push(line)
  }
  const answer = buf.join('\n').trim()
  if (!answer || /^不适用/.test(answer)) return { harvested: false, reason: '槽4 空/不适用' }
  const text = [
    '---',
    `author: flow-machine-draft`,
    `created_at: ${new Date().toISOString()}`,
    '---',
    `# 决策记录（Decisions）— ${change}`,
    '',
    `## D-001@v1: 风险与死路（design 槽4 收割）`,
    `- 决策：${answer.replace(/\n+/g, '\n  ')}`,
    '',
  ].join('\n')
  writeAtomicSync(decPath, text)
  return { harvested: true }
}

export default { reconcileModuleDocs, renderVerifyReceipt, harvestSlot4Decision }
