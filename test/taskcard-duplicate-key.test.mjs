/**
 * TaskCard frontmatter 顶层键重复检测直测（2026-09-16-friction5-hardening FR-02 / D-004@v1）。
 *
 * 坑锚定（用户 2026-09-16 驾驭小结②）：taskcard 骨架双来源反填 depends_on 后 agent 重复
 * 手填同键——js-yaml 4 对重复映射键 throw、plan-postcheck 四处 jsYaml.load catch 静默降级
 * 吞字段、parseDependsOn 正则取首个命中 → feasibility 入口单点拦截（detectDuplicateTopKeys）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { detectDuplicateTopKeys, validatePlanFeasibility } from '../src/stages/plan-postcheck.js'

const tmpRoots = []
function mkChange(name) {
  const d = mkdtempSync(join(tmpdir(), name))
  tmpRoots.push(d)
  return d
}
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

function extractFm(content) {
  // 入口 CRLF 归一（与 detectDuplicateTopKeys/parseDependsOn 同惯例——^---\n 锚点不认 \r）
  return content.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---/)[1]
}

function writeCard(changeDir, content) {
  mkdirSync(join(changeDir, 'tasks'), { recursive: true })
  writeFileSync(join(changeDir, 'tasks', 'task-01.md'), content)
}

// 骨架位 depends_on（L5）+ agent 尾部追加同键（L13）——驾驭小结②原场景
const DUP_CARD = [
  '---',
  'id: task-01',
  'title: dup key test',
  'title_zh: 重复键测试',
  'priority: P0',
  'depends_on: []',
  'allowed_paths:',
  '  - src/app.js',
  'goal: 实现 X',
  'implementation: 修改 src/app.js',
  'acceptance: 接口正确',
  'verify: npm run test:unit',
  'constraints: 不破坏旧接口',
  'depends_on: []',
  '---',
  '',
  '## 验收标准',
  '',
  '- ok',
  '',
].join('\n')

// 无重复键：块列表 allowed_paths / implementation 缩进子项 / goal: > 折叠块（R-04 边界）
const CLEAN_CARD = [
  '---',
  'id: task-01',
  'title: clean card',
  'title_zh: 干净卡',
  'priority: P0',
  'depends_on: []',
  'allowed_paths:',
  '  - src/clean.js',
  'goal: >',
  '  折叠块目标说明（缩进续行不得误判顶层键）',
  'implementation:',
  '  - 步骤一',
  '  - 步骤二',
  'acceptance: 接口正确',
  'verify: npm run test:unit',
  'constraints: none',
  '---',
  '',
  '## 验收标准',
  '',
  '- ok',
  '',
].join('\n')

test('detectDuplicateTopKeys：depends_on 两处（骨架位 + 尾部追加）返回键与两行号', () => {
  const dups = detectDuplicateTopKeys(extractFm(DUP_CARD))
  assert.equal(dups.length, 1, '仅 depends_on 一个重复键')
  assert.equal(dups[0].key, 'depends_on')
  assert.deepEqual(dups[0].lines, [5, 13], '行号 1-based 相对 fmText')
})

test('feasibility：重复 depends_on 报 error 且文案含键名/次数/行号', () => {
  const changeDir = mkChange('dup-key-')
  writeCard(changeDir, DUP_CARD)
  const r = validatePlanFeasibility(changeDir)
  const hit = r.errors.find(e => e.includes('重复出现'))
  assert.ok(hit, `error 在场（实际 errors: ${JSON.stringify(r.errors)}）`)
  assert.ok(hit.includes('task-01'), '文案前缀用 taskId')
  assert.ok(hit.includes('顶层键 depends_on'), '文案含键名')
  assert.ok(hit.includes('重复出现 2 次'), '文案含次数')
  assert.ok(hit.includes('L5、L13'), '文案含两个行号')
  assert.ok(hit.includes('勿重复手填'), '文案含修复指引')
})

test('无重复键卡（块列表/缩进子键/goal 折叠块）零误报且 feasibility 零 error', () => {
  const dups = detectDuplicateTopKeys(extractFm(CLEAN_CARD))
  assert.deepEqual(dups, [], '折叠块续行与缩进列表项不判顶层键')
  const changeDir = mkChange('dup-key-clean-')
  writeCard(changeDir, CLEAN_CARD)
  const r = validatePlanFeasibility(changeDir)
  assert.deepEqual(r.errors, [], `字段齐全干净卡零 error（实际: ${JSON.stringify(r.errors)}）`)
})

test('CRLF 输入等价（行号/文案与 LF 逐字一致）', () => {
  // 纯函数直喂 CRLF fm 文本（不经 extractFm 归一，验函数自身入口容错）
  const crlfFm = extractFm(DUP_CARD).replace(/\n/g, '\r\n')
  assert.deepEqual(detectDuplicateTopKeys(crlfFm), [{ key: 'depends_on', lines: [5, 13] }],
    '纯函数入口 CRLF 归一，行号不变')
  const changeDir = mkChange('dup-key-crlf-')
  mkdirSync(join(changeDir, 'tasks'), { recursive: true })
  writeFileSync(join(changeDir, 'tasks', 'task-01.md'), DUP_CARD.replace(/\n/g, '\r\n'))
  const r = validatePlanFeasibility(changeDir)
  const hit = r.errors.find(e => e.includes('重复出现'))
  assert.ok(hit && hit.includes('L5、L13'), `CRLF 卡同样报两行号（实际 errors: ${JSON.stringify(r.errors)}）`)
})
