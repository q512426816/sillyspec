/**
 * config-validate.test.mjs — config validate 逐键校验 + 配置引导技能（2026-10-23-config-validate-skill）
 *
 *   ① validateLocalYamlContent unit 八态：好配置过/坏类型错/未知键警/段内缺凭据错/
 *      空文件过+info/deprecated info/枚举越界错/占位段免误报（FR-01）
 *   ② CLI e2e：--json 双态与退出码（坏 1/好 0/缺文件 0 零配置契约）（FR-01）
 *   ③ 技能文件存在性与硬门文案锚（FR-02）
 *   ④ config help 列 validate 行＋本会话新键已注册（schema 补登锚）（FR-03/FR-04）
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateLocalYamlContent, cmdConfigValidate } from '../src/config-validate.js'
import { flatKeys } from '../src/config-schema.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CLI = join(ROOT, 'src', 'index.js')

const GOOD = [
  'project:',
  '  type: nodejs',
  'commands:',
  '  lint: npm run lint',
  '  test_timeout_sec: 2400',
  'test_strategy: full',
  'fr_regress_cap: 40',
  'turbo: docs-auto',
  'review_inline_wait: 180',
  'dirty_gate_ignore: quicklog, test/.sillyspec',
  'mcp:',
  '  url: https://hub.example.com',
  '  token: tk-123',
].join('\n') + '\n'

test('① validateLocalYamlContent unit 八态', () => {
  // 1 好配置过（零错误零警告，计数=在场注册键数）
  const ok = validateLocalYamlContent(GOOD)
  assert.deepEqual([ok.errors, ok.warnings], [[], []], `好配置零错零警（实际 ${JSON.stringify(ok)}）`)
  assert.equal(ok.keysChecked, 10, `已查 10 键（实际 ${ok.keysChecked}）`)
  // 2 坏类型错：FR-01 承诺场景（number 键收不可强转字符串）＋结构错配双形态（评审 P1 修正锚）
  const badNum = validateLocalYamlContent('commands:\n  test_timeout_sec: "abc"\n')
  assert.ok(badNum.errors.some((e) => e.includes('commands.test_timeout_sec') && e.includes('期望')), `FR 场景坏数字串判错（${badNum.errors}）`)
  const badType = validateLocalYamlContent('commands:\n  lint:\n    a: 1\n')
  assert.ok(badType.errors.some((e) => e.includes('commands.lint')), `结构类型错点名键（${badType.errors}）`)
  // 2b 数字串可强转同义（宽容不误伤）
  const numStr = validateLocalYamlContent('commands:\n  test_timeout_sec: "2400"\n')
  assert.equal(numStr.errors.length, 0, `数字串合法（${numStr.errors}）`)
  // 2c boolean 键收非 true/false 串判错
  const badBool = validateLocalYamlContent('commands:\n  knowledge-gate: "nope"\n')
  assert.ok(badBool.errors.some((e) => e.includes('knowledge-gate')), `坏布尔串判错（${badBool.errors}）`)
  // 3 未知键警
  const unknown = validateLocalYamlContent('totally_unknown: 1\n')
  assert.equal(unknown.errors.length, 0)
  assert.ok(unknown.warnings.some((w) => w.includes('totally_unknown')), '未知顶层键警告')
  // 4 段内缺凭据错（mcp 有 url 无 token）
  const half = validateLocalYamlContent('mcp:\n  url: https://x.example.com\n')
  assert.ok(half.errors.some((e) => e.includes('mcp') && e.includes('token')), `缺必填键点名（${half.errors}）`)
  // 5 空文件过 + info
  const empty = validateLocalYamlContent('# 只有注释\n')
  assert.deepEqual([empty.errors, empty.warnings], [[], []])
  assert.ok(empty.infos.some((i) => i.includes('无任何已注册键')), '空文件 info')
  // 6 deprecated info（commands.test 已退役）
  const dep = validateLocalYamlContent('commands:\n  test: npm test\n')
  assert.ok(dep.infos.some((i) => i.includes('commands.test') && i.includes('退役')), 'deprecated 键 info')
  // 7 枚举越界错
  const enumBad = validateLocalYamlContent('project:\n  type: ruby\n')
  assert.ok(enumBad.errors.some((e) => e.includes('project.type') && e.includes('越界')), `枚举越界点名（${enumBad.errors}）`)
  // 8 占位段免误报（modules.<name> 子键名自定义不警告）
  const ph = validateLocalYamlContent('modules:\n  core:\n    paths:\n      - src/\n')
  assert.ok(!ph.warnings.some((w) => w.includes('modules.core')), `占位段子键免误报（${ph.warnings}）`)
  // 附：YAML 解析失败
  const badYaml = validateLocalYamlContent('a:\n\t- tab indent\n')
  assert.ok(badYaml.errors.some((e) => e.includes('YAML 解析失败')), '坏 YAML 错误')
})

test('② CLI e2e：--json 双态与退出码（坏 1/好 0/缺文件 0）', () => {
  const d = mkdtempSync(join(tmpdir(), 'cv-'))
  try {
    mkdirSync(join(d, '.sillyspec'), { recursive: true })
    const p = join(d, '.sillyspec', 'local.yaml')
    const cli = (args) => spawnSync(process.execPath, [CLI, ...args], { cwd: d, encoding: 'utf8', timeout: 60_000, env: { ...process.env, SILLYSPEC_WATCHER: '0' } })
    // 坏：段内缺凭据 → exit 1，--json 单对象
    writeFileSync(p, 'mcp:\n  url: https://x\n')
    const bad = cli(['config', 'validate', '--json'])
    assert.equal(bad.status, 1, `坏配置 exit 1（实际 ${bad.status}）`)
    const jb = JSON.parse(bad.stdout)
    assert.equal(jb.passed, false)
    assert.ok(Array.isArray(jb.errors) && jb.errors.length > 0)
    // 人类渲染同判定同码
    const badH = cli(['config', 'validate'])
    assert.equal(badH.status, 1, '人类渲染同退出码')
    assert.match(badH.stdout + badH.stderr, /校验未通过/)
    // 好 → exit 0
    writeFileSync(p, GOOD)
    const good = cli(['config', 'validate', '--json'])
    assert.equal(good.status, 0, `好配置 exit 0（输出 ${(good.stdout || '').slice(0, 200)}）`)
    assert.equal(JSON.parse(good.stdout).passed, true)
    // 缺文件 → exit 0 零配置契约
    rmSync(p, { force: true })
    const miss = cli(['config', 'validate', '--json'])
    assert.equal(miss.status, 0, '缺文件 exit 0（零配置可用）')
    const jm = JSON.parse(miss.stdout)
    assert.equal(jm.exists, false)
    assert.ok(jm.infos.some((i) => i.includes('零配置')), 'info 含零配置契约句')
    // cmdConfigValidate 直调缺文件同 0
    assert.equal(cmdConfigValidate({ dir: d, json: false }), 0)
  } finally { rmSync(d, { recursive: true, force: true, maxRetries: 3 }) }
})

test('③ 技能文件在场与硬门文案锚', () => {
  const p = join(ROOT, '.claude', 'skills', 'sillyspec-config', 'SKILL.md')
  assert.ok(existsSync(p), '技能文件在场（init 分发源 .claude/skills/sillyspec-*）')
  const t = readFileSync(p, 'utf8')
  assert.match(t, /默认零配置可用/, '首节零配置契约')
  assert.match(t, /必填场景决策表/, '决策表在场')
  assert.match(t, /config validate/, '硬门命令在场')
  assert.match(t, /exit 0 才算配置完成/, '硬门表述（不通过不许宣称完成）')
  assert.match(t, /platform connect/, '凭据族引导走 connect 非手填')
})

test('④ help 列 validate 行＋本会话新键已注册（schema 补登锚）', () => {
  const src = readFileSync(join(ROOT, 'src', 'index.js'), 'utf8')
  assert.match(src, /config validate \[--json\].*逐键校验/, 'help 文案列 validate')
  const paths = new Set(flatKeys().map((k) => k.path))
  for (const key of ['turbo', 'review_inline_wait', 'dirty_gate_ignore', 'module_gate_ignore', 'fr_regress_cap']) {
    assert.ok(paths.has(key), `本会话键「${key}」已注册 config-schema（发现面/校验面/示例面三同源）`)
  }
})
