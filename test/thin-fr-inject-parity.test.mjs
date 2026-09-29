/**
 * thin-fr-inject-parity.test.mjs — 轻量道知识读取面对齐（2026-09-25-thin-fr-inject-parity）
 *
 * 验收面：
 *   ① flowKnowledgeDigest：filesOverride 域路由命中 active FR（索引序渲染——待复核标记层已拆，
 *      2026-09-29-rot-retire-inject-cap：存量标记行在文件里也只作惰性文本）+ 否决决策命中
 *      （matchKnowledge 复用）；无域依据/全空退化一行可见；
 *   ② rotSuspectFlow：触达域 active FR → fr-rot-suspect 遥测（不落盘标记——收口 advisory 即止）；
 *   ③ frDupGateFlow：新 FR × 同域 active 标题 bigram ≥0.6 → 告警 + fr-duplicate-warning 遥测；
 *   ④ flow start fresh 简报端到端含知识注入段（--input 路径语料域路由）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CLI = join(ROOT, 'src', 'index.js')
const { flowKnowledgeDigest, rotSuspectFlow, frDupGateFlow } = await import(pathToFileURL(join(ROOT, 'src', 'flow.js')).href)

/** 最小 specBase 夹具：cli 域（src/cli/ 前缀）+ 归档件（coverage 源：hist-a 触达 / hist-b 不触达 /
 *  hist-c 缺归档=unknown）+ active FR 三条（含绑定/旧待复核标记）+ rejected 决策 + INDEX 路由。 */
function buildSpecRoot(base) {
  const specBase = join(base, '.sillyspec')
  const knowledge = join(specBase, 'knowledge')
  mkdirSync(join(knowledge, 'fr'), { recursive: true })
  mkdirSync(join(knowledge, 'decisions'), { recursive: true })
  const mapDir = join(specBase, 'docs', 'proj', 'modules')
  mkdirSync(mapDir, { recursive: true })
  writeFileSync(join(mapDir, '_module-map.yaml'), 'modules:\n  cli:\n    paths:\n      - src/cli/\n')
  const arc = join(specBase, 'changes', 'archive')
  mkdirSync(join(arc, 'hist-a'), { recursive: true })
  writeFileSync(join(arc, 'hist-a', 'change-patch.json'), JSON.stringify({ change: 'hist-a', files: ['src/cli/login.js'] }))
  mkdirSync(join(arc, 'hist-b'), { recursive: true })
  writeFileSync(join(arc, 'hist-b', 'change-patch.json'), JSON.stringify({ change: 'hist-b', files: ['src/other/x.js'] }))
  // hist-c 故意不建归档（unknown 用例：来源变更无归档件且无绑定）
  writeFileSync(join(knowledge, 'fr', 'cli.md'), [
    '---',
    'author: sillyspec-fr-index',
    '---',
    '',
    '# FR 索引 — cli',
    '',
    '## FR-cli-001 登录必须校验会话',
    '变更：hist-a',
    '状态：active',
    '摘要：默认场景',
    '场景正文：',
    '- 场景：默认场景 — Given 会话存在 When 调登录 Then 校验通过',
    '全文：hist-a/requirements.md#FR-01',
    '最近确认：aaaa1111',
    '测试绑定：',
    '<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->',
    '- row: hist-a:flow:FR-01',
    '  tests: test/cli.test.mjs',
    '  reason: spec',
    '',
    '## FR-cli-002 登录失败必须限流',
    '变更：hist-b',
    '状态：active',
    '摘要：默认场景',
    '场景正文：',
    '- 场景：默认场景 — Given 连续失败 When 超阈 Then 限流',
    '全文：hist-b/requirements.md#FR-01',
    '最近确认：bbbb2222',
    '待复核：quick-abc',
    '',
    '## FR-cli-003 登录页必须显示品牌标识',
    '变更：hist-c',
    '状态：active',
    '摘要：默认场景',
    '场景正文：',
    '- 场景：默认场景 — Given 登录页渲染 When 加载完成 Then 品牌标识可见',
    '全文：hist-c/requirements.md#FR-01',
    '最近确认：cccc3333',
    '',
  ].join('\n'))
  writeFileSync(join(knowledge, 'decisions', 'cli.md'), [
    '# 决策 — cli',
    '',
    '## D-001@v1 登录页采用 Modal 弹窗',
    '变更：hist-c',
    '状态：rejected',
    '否决理由：性能差且遮挡上下文',
    '复潮条件：设计系统提供非模态登录组件',
    '',
  ].join('\n'))
  writeFileSync(join(knowledge, 'INDEX.md'), [
    '# 知识索引',
    '',
    '## Decisions',
    '- 登录|决策|Modal → [decisions/cli.md](decisions/cli.md)',
    '',
  ].join('\n'))
  return specBase
}

test('① flowKnowledgeDigest：域路由命中 active FR（索引序、无 ⚠️）+ 否决决策命中', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'fip1-'))
  try {
    const specBase = buildSpecRoot(tmp)
    const changeDir = join(specBase, 'changes', 'c-digest')
    mkdirSync(changeDir, { recursive: true })
    const r = await flowKnowledgeDigest({ specBase, change: 'c-digest', changeDir, input: '登录流程重构', filesOverride: ['src/cli/login.js'] })
    assert.ok(r.lines.some((l) => l.includes('触达域')), '应含触达域行')
    assert.ok(r.lines.some((l) => l.includes('FR-cli-001')), '应含首条 active 条目（索引序）')
    assert.ok(r.lines.some((l) => l.includes('FR-cli-002')), '应含次条 active 条目')
    // 标记层拆除钉：文件里残留的「待复核：」旧行不再进注入渲染（fixture FR-cli-002 带惰性旧行）
    // （否决决策段的 ⚠️ 段头是另一机制，不在断言面内）
    const frLines = r.lines.filter((l) => /- FR-cli-\d+/.test(l))
    assert.ok(frLines.length >= 2 && !frLines.some((l) => l.includes('⚠️') || l.includes('待复核')), 'FR 条目行不得再渲染 ⚠️待复核（标记层已拆）')
    assert.ok(r.lines.some((l) => l.includes('D-001@v1') && l.includes('否决理由')), '应含否决决策命中及理由')
    assert.equal(r.summary.frCount, 3)
    assert.equal(r.summary.rejectedDecisions, 1)
    const firstIdx = r.lines.findIndex((l) => l.includes('FR-cli-001'))
    const secondIdx = r.lines.findIndex((l) => l.includes('FR-cli-002'))
    assert.ok(firstIdx >= 0 && firstIdx < secondIdx, '条目按索引序渲染（不再按标记置前）')
  } finally { rmSync(tmp, { recursive: true, force: true }) }
})

test('① flowKnowledgeDigest：无域依据且语料不命中 → 折叠一行可见（注入面存在性不因空消失）', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'fip2-'))
  try {
    const specBase = buildSpecRoot(tmp)
    const changeDir = join(specBase, 'changes', 'c-empty')
    mkdirSync(changeDir, { recursive: true })
    const r = await flowKnowledgeDigest({ specBase, change: 'zzz-unrelated', changeDir, input: '', filesOverride: [] })
    assert.equal(r.lines.length, 1, `应折叠为一行，实际：${JSON.stringify(r.lines)}`)
    assert.ok(r.lines[0].includes('未命中') || r.lines[0].includes('无'), '空态行应说明未命中')
    assert.equal(r.summary.frCount, 0)
  } finally { rmSync(tmp, { recursive: true, force: true }) }
})

test('② rotSuspectFlow：三分判据（strong/skip/unknown）+ 遥测 count=strong + 不落盘', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'fip3-'))
  try {
    const specBase = buildSpecRoot(tmp)
    const frPathBefore = readFileSync(join(specBase, 'knowledge', 'fr', 'cli.md'), 'utf8')
    const r = await rotSuspectFlow({ specBase, change: 'c-rot', changeDir: join(specBase, 'changes', 'c-rot'), files: ['src/cli/login.js'] })
    // FR-001（hist-a 归档 files 含 src/cli/login.js + 绑定）→ strong；FR-002（hist-b 归档 src/other）→ skip；FR-003（hist-c 无归档无绑定）→ unknown
    assert.equal(r.strong, 1, `strong 应为 1，实际 ${r.strong}`)
    assert.equal(r.skip, 1, `skip 应为 1，实际 ${r.skip}`)
    assert.equal(r.unknown, 1, `unknown 应为 1，实际 ${r.unknown}`)
    assert.ok(!('marked' in r), '返回值不再携带 marked（标记层已拆）')
    const hits = readFileSync(join(specBase, '.runtime', 'knowledge-hits.jsonl'), 'utf8')
    assert.ok(hits.includes('fr-rot-suspect') && hits.includes('"source":"flow-done"'))
    assert.ok(hits.includes('"strong":1') && hits.includes('"count":1'), '遥测 count 语义=strong（防污染 knowledge-stats）')
    assert.ok(hits.includes('"unknown":1'), 'unknown 单列遥测')
    // 不落盘钉：strong 命中后 fr 文件 byte 级不变（无新增待复核行，旧惰性行也不动）
    assert.equal(readFileSync(join(specBase, 'knowledge', 'fr', 'cli.md'), 'utf8'), frPathBefore, 'rot 命中不再改写 fr 文件')
    const { readActiveFrDigest } = await import(pathToFileURL(join(ROOT, 'src', 'fr-index.js')).href)
  const dig = readActiveFrDigest(join(specBase, 'knowledge'), ['cli'])
  const fr1 = dig.find((f) => f.id === 'FR-cli-001')
  assert.deepEqual(fr1.bindings, ['test/cli.test.mjs'], 'bindings 子块解析（顶格机器注释不终止收集——评审 P1 修复面）')
  // 源3命中用例：hist-e 归档文件面与 changed 无交集，但其绑定 test 文件在 changed 内 → strong 靠 bindings
  const arc = join(specBase, 'changes', 'archive')
  mkdirSync(join(arc, 'hist-e'), { recursive: true })
  writeFileSync(join(arc, 'hist-e', 'change-patch.json'), JSON.stringify({ change: 'hist-e', files: ['src/unrelated/deep.js'] }))
  const frPath = join(specBase, 'knowledge', 'fr', 'cli.md')
  writeFileSync(frPath, readFileSync(frPath, 'utf8') + [
    '',
    '## FR-cli-004 登录导出报表',
    '变更：hist-e',
    '状态：active',
    '摘要：默认场景',
    '场景正文：',
    '- 场景：默认场景 — Given 登录后 When 请求报表 Then 导出',
    '全文：hist-e/requirements.md#FR-01',
    '最近确认：eeee4444',
    '测试绑定：',
    '<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->',
    '- row: hist-e:flow:FR-01',
    '  tests: test/cli-report.test.mjs',
    '  reason: spec',
    '',
  ].join('\n'))
  const r2 = await rotSuspectFlow({ specBase, change: 'c-rot3', changeDir: join(specBase, 'changes', 'c-rot3'), files: ['src/cli/touch.js', 'test/cli-report.test.mjs'] })
  assert.ok(r2.strong >= 1, '源3（bindings）单独命中也应 strong（评审 P1 修复验证）')
  const miss = await rotSuspectFlow({ specBase, change: 'c-rot2', changeDir: join(specBase, 'changes', 'c-rot2'), files: ['docs/other/x.md'] })
    assert.equal(miss.warn, null, '非触达域文件应零告警')
  } finally { rmSync(tmp, { recursive: true, force: true }) }
})

test('③ frDupGateFlow：标题重叠 ≥0.6 告警 + 遥测；承接行豁免；无关标题零告警', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'fip4-'))
  try {
    const specBase = buildSpecRoot(tmp)
    const changeDir = join(specBase, 'changes', 'c-dup')
    mkdirSync(changeDir, { recursive: true })
    writeFileSync(join(changeDir, 'requirements.md'), [
      '# 需求',
      '',
      '### FR-01: 登录必须校验会话',
      'Given x',
      'When y',
      'Then z',
      '',
      '### FR-02: 完全无关的导出功能',
      'Given a',
      'When b',
      'Then c',
      '',
    ].join('\n'))
    const r = await frDupGateFlow({ specBase, change: 'c-dup', changeDir, files: ['src/cli/login.js'] })
    assert.equal(r.hits.length, 1, `只应命中重叠标题，实际：${JSON.stringify(r.hits)}`)
    assert.ok(r.warn.includes('FR-01↔FR-cli-001'), '告警应指明 local↔active 对')
    const hits = readFileSync(join(specBase, '.runtime', 'knowledge-hits.jsonl'), 'utf8')
    assert.ok(hits.includes('fr-duplicate-warning') && hits.includes('"source":"flow-done"'))
    // 承接行豁免：FR-01 加承接后不再命中
    writeFileSync(join(changeDir, 'requirements.md'), [
      '# 需求',
      '',
      '### FR-01: 登录必须校验会话',
      '承接: FR-cli-001',
      'Given x',
      'When y',
      'Then z',
      '',
    ].join('\n'))
    const r2 = await frDupGateFlow({ specBase, change: 'c-dup', changeDir, files: ['src/cli/login.js'] })
    assert.equal(r2.warn, null, '有承接行的 FR 应豁免')
  } finally { rmSync(tmp, { recursive: true, force: true }) }
})

test('④ flow start fresh 简报端到端：知识注入段在场（--input 路径语料域路由）', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'fip5-'))
  try {
    const g = (a) => execFileSync('git', a, { cwd, stdio: 'pipe' })
    g(['init', '-q']); g(['config', 'user.email', 't@t']); g(['config', 'user.name', 't'])
    writeFileSync(join(cwd, '.sillyspec.yaml'), 'project:\n  type: generic\n')
    writeFileSync(join(cwd, 'base.txt'), 'b\n')
    g(['add', '.']); g(['commit', '-q', '-m', 'b'])
    buildSpecRoot(cwd)
    // local.yaml（2026-09-26 起 flow start fail-fast：init 级配置缺席拒绝执行）
    writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'commands:\n  test: node -e "1"\n')
    const r = spawnSync(process.execPath, [CLI, 'flow', 'start', '--change', '2026-09-01-e2e-inject', '--input',
      '动机：登录流程调整，涉及 src/cli/login.js\n成功标准：\n- 登录行为保持'], {
      cwd, encoding: 'utf8', timeout: 120_000, env: { ...process.env, SILLYSPEC_WATCHER: '0' },
    })
    assert.equal(r.status, 0, `flow start 应成功，stderr：${r.stderr}`)
    assert.ok(r.stdout.includes('🧠 知识注入'), 'fresh 简报应含知识注入段')
    assert.ok(r.stdout.includes('FR-cli-001'), '注入段应含触达域现行 FR')
    assert.ok(r.stdout.includes('材料路径清单'), '稳定前缀材料清单应保留且在前')
    assert.ok(r.stdout.indexOf('材料路径清单') < r.stdout.indexOf('🧠 知识注入'), '注入段应在材料清单之后（不污染稳定前缀）')
  } finally { rmSync(cwd, { recursive: true, force: true }) }
})
