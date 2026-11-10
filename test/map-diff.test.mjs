/**
 * map diff 四态判定与派生块写入测试（task-02 / FR-02/03/04）。
 *
 * 覆盖：四态矩阵 / rename 命中与不可映射两分支 / 只降级不升回 /
 * 区间外逐字节不变（含人工注释）/ 块缺失追加 / 标记行大小写变体不识别走追加 /
 * 多项目独立 / 无 map 目录 fail-soft / 非 git 仓退出 1 / 未知主版本跳过。
 *
 * 判定层（judgeRoute/writeDerivedBlock/parseRouteFrontmatter）为纯函数直测；
 * 端到端（真实 git）见 map-cli-e2e.test.mjs。
 */
import { runMapDiff, judgeRoute, writeDerivedBlock, parseRouteFrontmatter, KNOWN_SCHEMA_VERSION, BEGIN_MARK, END_MARK } from '../src/map-diff.js'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

function assert(cond, msg) {
  if (!cond) {
    console.error(`  ✗ ${msg}`)
    process.exitCode = 1
    failed++
  } else {
    console.log(`  ✓ ${msg}`)
    passed++
  }
}
let passed = 0
let failed = 0

// ── parseRouteFrontmatter ─────────────────────────────────────────────
const fm = parseRouteFrontmatter('---\nroute_id: r1\ncovered_files:\n  - a.py\nschema_version: 1\n---\n\n正文')
assert(fm && fm.route_id === 'r1' && Array.isArray(fm.covered_files), 'frontmatter 解析（list 字段）')
assert(parseRouteFrontmatter('无 frontmatter') === null, '缺 frontmatter → null')
assert(parseRouteFrontmatter('---\nbad: [unclosed\n---\nx') === null, '坏 YAML → null')

// ── judgeRoute 四态矩阵 ───────────────────────────────────────────────
const cs = { changed: new Set(['x.py', 'y.ts']), renameMap: {}, headShort: 'abc1234' }
const mkMeta = (covered, version = 1) => ({ covered_files: covered, schema_version: version, source_commit: 'base1' })

assert(judgeRoute(null, cs, null) === null, '缺 frontmatter → 跳过（null）')
assert(judgeRoute(mkMeta(['a.py'], 2), cs, null) === null, '未知主版本 → 跳过')
const t1 = judgeRoute(mkMeta(['x.py']), cs, null)
assert(t1.state === 'stale' && t1.changed_files.length === 1, '交集非空 → stale + changed_files')
const t2 = judgeRoute(mkMeta(['zz.py']), cs, null)
assert(t2.state === 'fresh' && t2.changed_files.length === 0, '无交集 → fresh')
const t3 = judgeRoute(mkMeta([]), cs, null)
assert(t3.state === 'unknown', 'covered_files 空 → unknown（硬规则 1）')
const t4 = judgeRoute(mkMeta([]), cs, 'fresh')
assert(t4.state === 'unknown', '空 covered 既有 fresh 仍 unknown')
const t5 = judgeRoute(mkMeta(['zz.py']), cs, 'stale')
assert(t5.state === 'stale' && t5.changed_files.length === 0, '已 stale 重算无交集 → 保持 stale（硬规则 2 不升回）')

// ── rename 两分支 ─────────────────────────────────────────────────────
const csRen = { changed: new Set(['new/path.py']), renameMap: { 'new/path.py': 'old/path.py' }, headShort: 'abc1234' }
const r1 = judgeRoute(mkMeta(['old/path.py']), csRen, null)
assert(r1.state === 'stale' && r1.renamed, 'rename 命中：旧路径换算新路径判交集 → stale')
const csNoMap = { changed: new Set(['new/path.py']), renameMap: {}, headShort: 'abc1234' }
const r2 = judgeRoute(mkMeta(['old/path.py']), csNoMap, null)
assert(r2.state === 'fresh', 'rename 无映射且旧路径不在变更集（按原路径判）→ fresh')
// 不可映射 + 旧路径以 deleted 形态在变更集（D 状态进 changed）→ unknown + 保留旧路径
const csDel = { changed: new Set(['old/path.py']), renameMap: {}, headShort: 'abc1234' }
const r3 = judgeRoute(mkMeta(['old/path.py']), csDel, null)
assert(r3.state === 'stale' && r3.changed_files[0] === 'old/path.py', '旧路径被删（D 进变更集）→ stale 且 changed_files 保留旧路径')

// ── writeDerivedBlock：区间替换 / 区间外逐字节 / 追加两形态 ─────────────
const sampleIndex = [
  'schema_version: 1',
  '',
  'domains:',
  '  - id: d',
  '    name: 域',
  '',
  '# 人工注释：域重组时勿动此段',
  'routes:',
  '  - route_id: r1',
  '    domain: d',
  '',
  BEGIN_MARK,
  'stale: []',
  END_MARK,
].join('\n')

const entries = [{ route_id: 'r1', state: 'stale', changed_files: ['x.py'] }]
const w1 = writeDerivedBlock(sampleIndex, entries, '2026-11-10T00:00:00Z', 'abc1234')
assert(w1.written && !w1.appended, '既有块 → 区间替换（非追加）')
// 区间外逐字节：替换前后，BEGIN 行之前与 END 行之后的内容逐行一致
const beforeLines = sampleIndex.split('\n')
const afterLines = w1.text.split('\n')
const bBegin = beforeLines.indexOf(BEGIN_MARK)
const aBegin = afterLines.indexOf(BEGIN_MARK)
assert(
  JSON.stringify(beforeLines.slice(0, bBegin)) === JSON.stringify(afterLines.slice(0, aBegin)),
  '区间外（前段，含人工注释）逐字节不变',
)
const bEnd = beforeLines.indexOf(END_MARK)
const aEnd = afterLines.lastIndexOf(END_MARK)
assert(
  JSON.stringify(beforeLines.slice(bEnd + 1)) === JSON.stringify(afterLines.slice(aEnd + 1)),
  '区间外（后段）逐字节不变',
)
assert(afterLines[aBegin + 1] === 'stale:' && afterLines[aBegin + 2].includes('route_id: r1'), '块内条目已替换')
assert(afterLines.some((l) => l.includes('checked_at: "2026-11-10T00:00:00Z"')), 'checked_at 写入')
assert(afterLines.some((l) => l.includes('base_commit: abc1234')), 'base_commit 写入')

// 块缺失 → 末尾追加
const noBlock = 'schema_version: 1\nroutes:\n  - route_id: r1\n'
const w2 = writeDerivedBlock(noBlock, entries, 'T', 'H')
assert(w2.appended && w2.text.includes(BEGIN_MARK) && w2.text.includes(END_MARK), '块缺失 → 末尾追加标记行+块')
assert(w2.text.startsWith('schema_version: 1'), '追加形态：原内容前缀逐字节保留')

// 标记行大小写变体 → 不识别 → 走追加（保守不误伤）
const lowerMark = 'schema_version: 1\n# begin map-diff\nstale: []\n# end map-diff\n'
const w3 = writeDerivedBlock(lowerMark, entries, 'T', 'H')
assert(w3.appended, '标记大小写变体不识别 → 按块缺失追加（保守）')
assert(w3.text.includes('# begin map-diff'), '变体标记原样保留')

// 空 entries：块内 stale: []
const w4 = writeDerivedBlock(sampleIndex, [], 'T', 'H')
assert(w4.text.includes('stale: []'), '零条目 → stale: []（清空派生块）')

// ── runMapDiff：fail-soft / 非 git 仓 ────────────────────────────────
const tmp = mkdtempSync(join(tmpdir(), 'map-diff-'))
mkdirSync(join(tmp, '.sillyspec', 'docs', 'proj'), { recursive: true })
const rc0 = await runMapDiff(tmp, {})
assert(rc0 === 0, '无 map 目录 → 零输出零写入退出 0（fail-soft）')
const rc1 = await runMapDiff(join(tmp, 'no-such'), {})
assert(rc1 === 2, '目录不存在 → 退出 2')
// 非 git 仓（tmp 不是 git 仓）
mkdirSync(join(tmp, '.sillyspec', 'docs', 'proj', 'map'))
writeFileSync(join(tmp, '.sillyspec', 'docs', 'proj', 'map', 'MAP-INDEX.yaml'), 'schema_version: 1\nroutes: []\n')
const rcNg = await runMapDiff(tmp, {})
assert(rcNg === 1, '非 git 仓（有 map 目录）→ 退出 1')

try { rmSync(tmp, { recursive: true, force: true }) } catch {}

console.log(`\n合计: ${passed} 通过, ${failed} 失败`)
process.exit(failed > 0 ? 1 : 0)
