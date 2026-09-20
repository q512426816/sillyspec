/**
 * task 卡 frontmatter 非法 YAML 硬门禁测试（2026-09-20-taskcard-yaml-hardgate task-04）。
 *
 * 夹具：test/fixtures/taskcard-bad-yaml/task-0{1,2,3}.md——multi-agent-platform 仓
 * 2026-09-20-scope-audit-cross-repo-platform 变更三张原卡整卡拷贝（字节原样，坏行就是夹具）。
 * 坏因：provides/expects_from 值为含未引号方括号+全角括号的 flow 序列，js-yaml 抛
 * `missed comma between flow collection entries`。坏行实测 20/22/26（独立审查 node 实测修正：
 * 调查报告的 19/21/25 是 YAML 文本内 1 基行号，文件行号 +1）。
 *
 * 覆盖（design AC-01~07）：
 * AC-01 parseTaskFrontmatter 行:列断言（20/22/26 + 列 35/17/78）
 * AC-02 validatePlanFeasibility 坏卡阻断（恰 N 条 0b error，无其他假阳性）
 * AC-03 parseTaskContracts yamlError 显式降级键
 * AC-04 validateCrossTaskContracts 坏卡零假阳性契约错误（D-001@v2 纯契约语义）
 * AC-05 parseTaskAcceptance 三态契约
 * AC-06 探针 7 渲染区分「frontmatter 非法 YAML」与「真无 acceptance」防御行
 * AC-07 重复键双报豁免（顶层重复 :1298 独占；嵌套重复 0b 兜底）
 */
import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

import { splitFrontmatter, parseTaskFrontmatter } from '../src/taskcard-frontmatter.js'
import { parseTaskContracts, validateCrossTaskContracts, validatePlanFeasibility } from '../src/stages/plan-postcheck.js'
import { parseTaskAcceptance, runVerifyProbes, generateVerifyResultSkeleton } from '../src/verify-probes.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FIXTURE_DIR = join(__dirname, 'fixtures', 'taskcard-bad-yaml')
const fixture = (n) => readFileSync(join(FIXTURE_DIR, `task-${n}.md`), 'utf8')

// 三卡坏行与列（mark+1 换算；AC-01 锚——换算错位即此断言挂，design R-01）
const BAD_POS = { '01': { line: 20, column: 35 }, '02': { line: 22, column: 17 }, '03': { line: 26, column: 78 } }

// ─── AC-01：共享解析源 ────────────────────────────────────────────────────
describe('parseTaskFrontmatter（AC-01）', () => {
  it('三张真实坏卡：!ok + 行:列精确 + js-yaml 原始 message', () => {
    for (const n of ['01', '02', '03']) {
      const r = parseTaskFrontmatter(fixture(n))
      assert.equal(r.ok, false, `task-${n} 应 ok=false`)
      assert.equal(r.hasFrontmatter, true)
      assert.equal(r.fm, null)
      assert.ok(r.error, `task-${n} error 在场`)
      assert.equal(r.error.line, BAD_POS[n].line, `task-${n} error.line 应为文件 1 基行 ${BAD_POS[n].line}（mark.line+2）`)
      assert.equal(r.error.column, BAD_POS[n].column, `task-${n} error.column 应为 1 基列 ${BAD_POS[n].column}（mark.column+1）`)
      assert.ok(r.error.message.includes('missed comma between flow collection entries'), `task-${n} message 含 js-yaml 原始信息：${r.error.message}`)
    }
  })

  it('合法 frontmatter → ok=true + fm 对象 + error=null', () => {
    const r = parseTaskFrontmatter('---\nid: task-01\nacceptance:\n  - a\n---\nbody')
    assert.equal(r.ok, true)
    assert.equal(r.hasFrontmatter, true)
    assert.equal(r.fm.id, 'task-01')
    assert.deepEqual(r.fm.acceptance, ['a'])
    assert.equal(r.error, null)
  })

  it('无 frontmatter → ok=true + hasFrontmatter=false（不是错误）', () => {
    const r = parseTaskFrontmatter('no frontmatter here')
    assert.equal(r.ok, true)
    assert.equal(r.hasFrontmatter, false)
    assert.equal(r.fm, null)
    assert.equal(r.error, null)
  })

  it('splitFrontmatter：CRLF 容错 + yamlStartLine 恒 2', () => {
    const lf = splitFrontmatter('---\nid: x\n---\n')
    assert.deepEqual([lf.has, lf.yamlStartLine], [true, 2])
    const crlf = splitFrontmatter('---\r\nid: x\r\n---\r\n')
    assert.equal(crlf.has, true, 'CRLF 卡提取不炸（界定口径含 \\r 容错）')
    assert.equal(splitFrontmatter('nothing').has, false)
  })
})

// ─── AC-02 / AC-07：feasibility 0b 硬校验 ─────────────────────────────────
describe('validatePlanFeasibility 步骤 0b（AC-02/AC-07）', () => {
  let changeDir
  const tasksDir = () => join(changeDir, 'tasks')
  beforeEach(() => {
    changeDir = join(tmpdir(), `sillyspec-hardgate-${Math.random().toString(36).slice(2)}`)
    mkdirSync(tasksDir(), { recursive: true })
  })
  afterEach(() => {
    try { rmSync(changeDir, { recursive: true, force: true }) } catch {}
  })

  it('AC-02：三张坏卡 → ok=false，恰 3 条 0b error（文件:行:列），无其他假阳性', () => {
    for (const n of ['01', '02', '03']) {
      writeFileSync(join(tasksDir(), `task-${n}.md`), fixture(n))
    }
    const r = validatePlanFeasibility(changeDir, null)
    assert.equal(r.ok, false)
    const gate = r.errors.filter(e => e.includes('frontmatter 非法 YAML'))
    assert.equal(gate.length, 3, `应恰 3 条 0b error（实际 errors=${JSON.stringify(r.errors)}）`)
    assert.ok(gate.some(e => e.includes('task-01.md:20:35')), 'task-01 行:列在文案中')
    assert.ok(gate.some(e => e.includes('task-02.md:22:17')), 'task-02 行:列在文案中')
    assert.ok(gate.some(e => e.includes('task-03.md:26:78')), 'task-03 行:列在文案中')
    assert.equal(r.errors.length, 3, `坏卡只报 0b 不产其他假阳性（实际 ${r.errors.length} 条）`)
  })

  it('AC-07：顶层重复键 → :1298 文案独占，0b 双报豁免', () => {
    const dupTop = [
      '---',
      'id: task-01',
      "title: 't'",
      "title_zh: '中'",
      'depends_on: []',
      'allowed_paths:',
      '  - src/foo.js',
      'goal: >',
      '  first',
      'goal: >',
      '  second',
      'implementation:',
      '  - i',
      'acceptance:',
      '  - a',
      'verify:',
      '  - node --check src/foo.js',
      'constraints:',
      '  - c',
      '---',
      'body',
    ].join('\n')
    writeFileSync(join(tasksDir(), 'task-01.md'), dupTop)
    const r = validatePlanFeasibility(changeDir, null)
    assert.equal(r.ok, false)
    assert.ok(r.errors.some(e => e.includes('顶层键 goal 重复出现')), ':1298 重复键文案在场')
    assert.equal(r.errors.filter(e => e.includes('frontmatter 非法 YAML')).length, 0,
      `0b 跳过不双报（实际 errors=${JSON.stringify(r.errors)}）`)
  })

  it('AC-07：嵌套重复键（顶格正则够不到）→ 0b 兜底上报', () => {
    const nestedDup = [
      '---',
      'id: task-01',
      "title: 't'",
      "title_zh: '中'",
      'depends_on: []',
      'allowed_paths:',
      '  - src/foo.js',
      'meta:',
      '  a: 1',
      '  a: 2',
      'goal: >',
      '  g',
      'implementation:',
      '  - i',
      'acceptance:',
      '  - a',
      'verify:',
      '  - node --check src/foo.js',
      'constraints:',
      '  - c',
      '---',
      'body',
    ].join('\n')
    writeFileSync(join(tasksDir(), 'task-01.md'), nestedDup)
    const r = validatePlanFeasibility(changeDir, null)
    assert.equal(r.ok, false)
    const gate = r.errors.filter(e => e.includes('frontmatter 非法 YAML'))
    assert.equal(gate.length, 1, '嵌套重复键由 0b 兜底（唯一上报源）')
    assert.ok(gate[0].includes('duplicated mapping key'), `message 含 js-yaml 重复键信息：${gate[0]}`)
  })

  it('好卡（合法 YAML 九字段全）→ 零新增错误', () => {
    writeFileSync(join(tasksDir(), 'task-01.md'), [
      '---',
      'id: task-01',
      "title: 'good'",
      "title_zh: '好卡'",
      'depends_on: []',
      'allowed_paths:',
      '  - src/foo.js',
      'provides:',
      '  - contract: Demo',
      '    fields:',
      "      - 'field a'",
      'goal: >',
      '  g',
      'implementation:',
      '  - i',
      'acceptance:',
      '  - a1',
      'verify:',
      '  - node --check src/foo.js',
      'constraints:',
      '  - c',
      '---',
      'body',
    ].join('\n'))
    const r = validatePlanFeasibility(changeDir, null)
    assert.deepEqual(r.errors, [], `好卡零错误（实际 ${JSON.stringify(r.errors)}）`)
  })
})

// ─── AC-03 / AC-04：契约面 ────────────────────────────────────────────────
describe('契约面（AC-03/AC-04）', () => {
  let changeDir
  const tasksDir = () => join(changeDir, 'tasks')
  beforeEach(() => {
    changeDir = join(tmpdir(), `sillyspec-hardgate-ct-${Math.random().toString(36).slice(2)}`)
    mkdirSync(tasksDir(), { recursive: true })
  })
  afterEach(() => {
    try { rmSync(changeDir, { recursive: true, force: true }) } catch {}
  })

  it('AC-03：parseTaskContracts 坏卡 → 空契约 + yamlError 非 null（显式降级不冒充）', () => {
    const p = parseTaskContracts(fixture('02'))
    assert.deepEqual(p.provides, [])
    assert.deepEqual(p.expectsFrom, {})
    assert.ok(p.yamlError, 'yamlError 在场')
    assert.equal(p.yamlError.line, BAD_POS['02'].line)
    assert.ok(p.yamlError.message.includes('missed comma'))
  })

  it('AC-03：合法卡 → 契约内容 + yamlError=null', () => {
    const p = parseTaskContracts([
      '---',
      'id: task-01',
      'provides:',
      '  - contract: Demo',
      '    fields:',
      "      - 'f1'",
      '---',
      'body',
    ].join('\n'))
    assert.equal(p.provides.length, 1)
    assert.equal(p.provides[0].contract, 'Demo')
    assert.equal(p.yamlError, null)
  })

  it('AC-04：validateCrossTaskContracts 对三张坏卡零假阳性（纯契约语义，阻断归 0b）', () => {
    for (const n of ['01', '02', '03']) {
      writeFileSync(join(tasksDir(), `task-${n}.md`), fixture(n))
    }
    const r = validateCrossTaskContracts(changeDir)
    assert.equal(r.ok, true, `坏卡不产假阳性契约错误（实际 ${JSON.stringify(r.errors)}）`)
    assert.equal(r.errors.length, 0)
  })
})

// ─── AC-05 / AC-06：verify 探针面 ─────────────────────────────────────────
describe('verify 探针面（AC-05/AC-06）', () => {
  it('AC-05：parseTaskAcceptance 三态', () => {
    const bad = parseTaskAcceptance(fixture('01'))
    assert.equal(bad.status, 'invalid-yaml')
    assert.deepEqual(bad.acceptance, [])
    assert.ok(bad.error && bad.error.line === BAD_POS['01'].line)

    const none = parseTaskAcceptance('no frontmatter here')
    assert.equal(none.status, 'no-frontmatter')

    const okArr = parseTaskAcceptance('---\nid: x\nacceptance:\n  - a\n  - b\n---\n')
    assert.equal(okArr.status, 'ok')
    assert.deepEqual(okArr.acceptance, ['a', 'b'])
    assert.equal(okArr.error, null)

    const okNone = parseTaskAcceptance('---\nid: x\n---\n')
    assert.equal(okNone.status, 'ok')
    assert.deepEqual(okNone.acceptance, [])
  })

  it('AC-06：坏卡渲染「frontmatter 非法 YAML」行，不渲染假防御行；真无 acceptance 保留防御行', () => {
    const proj = join(tmpdir(), `sillyspec-hardgate-p7-${Math.random().toString(36).slice(2)}`)
    const changeDir = join(proj, '.sillyspec', 'changes', 'c9')
    mkdirSync(join(changeDir, 'tasks'), { recursive: true })
    try {
      // 坏卡（真实夹具）+ 真无 acceptance 的合法卡并列
      writeFileSync(join(changeDir, 'tasks', 'task-01.md'), fixture('01'))
      writeFileSync(join(changeDir, 'tasks', 'task-02.md'), [
        '---',
        'id: task-02',
        "title: 'no-acc'",
        "title_zh: '无验收卡'",
        'depends_on: []',
        'allowed_paths:',
        '  - src/foo.js',
        'goal: >',
        '  g',
        'implementation:',
        '  - i',
        'acceptance: []',
        'verify:',
        '  - node --check src/foo.js',
        'constraints:',
        '  - c',
        '---',
        'body',
      ].join('\n'))
      const r = runVerifyProbes({ cwd: proj, changeName: 'c9' })
      const t1 = r.probe7.tasks.find(t => t.task === 'task-01')
      const t2 = r.probe7.tasks.find(t => t.task === 'task-02')
      assert.ok(t1, '坏卡不因解析失败被跳过')
      assert.ok(t1.fmError, '坏卡条目挂 fmError')
      assert.equal(t1.fmError.line, BAD_POS['01'].line)
      assert.ok(!t2.fmError, '合法无验收卡不挂 fmError')

      const skeleton = generateVerifyResultSkeleton(r)
      assert.ok(skeleton.includes('frontmatter 非法 YAML（task-01.md:20:35'), `骨架渲染坏 YAML 行带行:列（实际片段：${skeleton.split('\n').find(l => l.includes('frontmatter 非法 YAML')) || '(未找到)'}）`)
      const t1Section = skeleton.slice(skeleton.indexOf('**task-01**'), skeleton.indexOf('**task-02**'))
      assert.ok(!t1Section.includes('卡无 acceptance'), '坏卡不渲染假防御行')
      const t2Section = skeleton.slice(skeleton.indexOf('**task-02**'))
      assert.ok(t2Section.includes('卡无 acceptance——防御'), '真无 acceptance 合法卡保留防御行')
    } finally {
      rmSync(proj, { recursive: true, force: true })
    }
  })
})
