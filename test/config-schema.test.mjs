/**
 * config-schema 测试 — local.yaml 配置键单一数据源 + 渲染器 + init 落盘耦合。
 *
 * 覆盖：
 * 1. LOCAL_YAML_SCHEMA 结构健全（section/key 必填字段、declared 键 readers 必空）。
 * 2. renderSchemaHuman 含文件名 + live/declared 分组标记 + 各 live 键 path。
 * 3. renderSchemaJson 可 JSON.parse、含 file/sections/keys。
 * 4. 【防漂耦合·核心】renderExample 必含每个 live 键的首段+末段 token——加键忘 example 即红。
 * 5. CLI 集成：sillyspec config schema / --json / 未知子命令退出码。
 */
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execFileSync } from 'child_process'
import { tmpdir } from 'os'

import {
  LOCAL_YAML_SCHEMA,
  flatKeys,
  renderSchemaHuman,
  renderSchemaJson,
  renderExample,
} from '../src/config-schema.js'

const testDir = dirname(fileURLToPath(import.meta.url))
const binPath = join(testDir, '..', 'bin', 'sillyspec.js')

let failed = 0
let total = 0
function assert(condition, msg) {
  total++
  if (!condition) { failed++; console.log(`  ❌ FAIL: ${msg}`) }
  else console.log(`  ✅ PASS: ${msg}`)
}

// ── 1. 结构健全 ──
console.log('\n--- 1. LOCAL_YAML_SCHEMA 结构健全 ---')
{
  assert(Array.isArray(LOCAL_YAML_SCHEMA.sections) && LOCAL_YAML_SCHEMA.sections.length > 0, 'sections 非空数组')
  assert(typeof LOCAL_YAML_SCHEMA.file === 'string' && LOCAL_YAML_SCHEMA.file.length > 0, 'file 字段为非空 string')
  const keys = flatKeys()
  assert(keys.length >= 12, `至少 12 个键（实际 ${keys.length}）`)
  for (const k of keys) {
    assert(typeof k.path === 'string' && k.path.length > 0, `键 path 非空：${k.path}`)
    assert(['live', 'declared'].includes(k.status), `键 status 合法：${k.path}=${k.status}`)
    assert(Array.isArray(k.readers), `键 readers 是数组：${k.path}`)
    assert(typeof k.desc === 'string' && k.desc.length > 0, `键 desc 非空：${k.path}`)
  }
  // declared 键 readers 必空（无 reader 才叫 declared）
  const declared = keys.filter((k) => k.status === 'declared')
  for (const k of declared) {
    assert(k.readers.length === 0, `declared 键 readers 必空：${k.path}（实际 ${JSON.stringify(k.readers)}）`)
  }
  // live 键至少有一个 reader 符号名（可 grep）
  const live = keys.filter((k) => k.status === 'live')
  for (const k of live) {
    assert(k.readers.length > 0, `live 键至少一个 reader：${k.path}`)
  }
  console.log(`    （live=${live.length}, declared=${declared.length}）`)
  // auto_mode 接线后 live（2026-08-11）；fileWhitelist 已删（无消费方，不像路径A 预留）
  const amKeys = keys.filter((k) => k.section === 'auto_mode')
  for (const k of amKeys) assert(k.status === 'live', `auto_mode 已接线 live：${k.path}`)
  assert(!keys.some((k) => k.path === 'worktree-hook.fileWhitelist'), 'fileWhitelist 已从 schema 移除（无消费方）')
}

// ── 2. renderSchemaHuman ──
console.log('\n--- 2. renderSchemaHuman ---')
{
  const txt = renderSchemaHuman()
  assert(txt.includes(LOCAL_YAML_SCHEMA.file), 'human 输出含文件路径')
  assert(txt.includes('生效'), 'human 输出含「生效」分组标记')
  assert(txt.includes('声明但未接线'), 'human 输出含「声明但未接线」分组标记')
  assert(txt.includes('数据源：src/config-schema.js'), 'human 输出含数据源声明')
  // 每个 live section 的 id 出现
  for (const s of LOCAL_YAML_SCHEMA.sections) {
    if (s.keys.some((k) => k.status === 'live')) {
      assert(txt.includes(`[${s.id}]`), `human 输出含 live section 标签：[${s.id}]`)
    }
  }
  // 凭据必填键标注
  assert(txt.includes('必填'), 'human 输出标注必填')
}

// ── 3. renderSchemaJson ──
console.log('\n--- 3. renderSchemaJson ---')
{
  let parsed
  try { parsed = JSON.parse(renderSchemaJson()) } catch (e) { parsed = null }
  assert(parsed !== null, 'renderSchemaJson 可 JSON.parse')
  assert(parsed && parsed.file === LOCAL_YAML_SCHEMA.file, 'json 含 file')
  assert(parsed && Array.isArray(parsed.sections) && parsed.sections.length > 0, 'json 含 sections')
  assert(parsed && Array.isArray(parsed.keys) && parsed.keys.length === flatKeys().length, 'json.keys 数量与 flatKeys 一致')
}

// ── 4. renderExample 防漂耦合（核心）──
console.log('\n--- 4. renderExample 防漂耦合（每个 live 键首段+末段必现）---')
{
  const ex = renderExample()
  assert(ex.includes('# SillySpec local.yaml'), 'example 含标题')
  const liveKeys = flatKeys().filter((k) => k.status === 'live')
  for (const k of liveKeys) {
    // path 形如 mcp.url / worktree-hook.readonlyCommands / modules.<name>.path / test_strategy
    const segs = k.path.split('.')
    const first = segs[0].replace(/<[^>]+>/g, '') // 去占位 <name>
    const last = segs[segs.length - 1].replace(/<[^>]+>/g, '')
    // 作为独立 token（word boundary，含连字符段用锚定）出现在 example
    const firstRe = new RegExp(`(^|\\n|# \\s*)${escapeRe(first)}(:|\\b)`)
    const lastRe = new RegExp(`\\b${escapeRe(last)}\\b`)
    assert(firstRe.test(ex), `example 含 live 键首段 token「${first}」（来自 ${k.path}）`)
    if (last !== first) {
      assert(lastRe.test(ex), `example 含 live 键末段 token「${last}」（来自 ${k.path}）`)
    }
  }
  // 脱敏：token 占位符，不能泄露真实凭据
  assert(ex.includes('<your-mcp-token>'), 'example mcp.token 用占位符脱敏')
  assert(ex.includes('<your-platform-token>'), 'example platform.token 用占位符脱敏')
  // test_strategy 枚举防漂（D-005@v2）：四值齐全且 example 注释提及 skip/evidence-auto 语义
  const tsKey = liveKeys.find((k) => k.path === 'test_strategy')
  assert(tsKey && Array.isArray(tsKey.values), 'test_strategy 键存在且 values 为数组')
  assert(
    tsKey && tsKey.values.length === 4 &&
      ['full', 'module', 'skip', 'evidence-auto'].every((v) => tsKey.values.includes(v)),
    `test_strategy 枚举含 full/module/skip/evidence-auto 四值（实际 ${JSON.stringify(tsKey && tsKey.values)}）`
  )
  assert(ex.includes('skip=真跳过'), 'example test_strategy 注释含 skip=真跳过语义')
  assert(ex.includes('evidence-auto'), 'example test_strategy 注释含 evidence-auto')
  // decisions.behind_threshold 防漂（task-11 新 live 键）：live + example 含 token（非注释行）
  const btKey = liveKeys.find((k) => k.path === 'decisions.behind_threshold')
  assert(btKey && btKey.status === 'live' && btKey.type === 'integer', 'decisions.behind_threshold 为 live integer 键')
  assert(ex.includes('behind_threshold'), 'example 含 decisions.behind_threshold token')
  assert(/^decisions:/m.test(ex), 'decisions 段在 example 为非注释行（live）')
  assert(/^ {2}behind_threshold:/m.test(ex), 'behind_threshold 在 example 为非注释行（live）')
  // poll_interval_ms/worker_timeout_ms（路径A 预留·未落地）仍在 example 注释提醒；auto_mode 已 live 取消注释；fileWhitelist 已移除
  assert(ex.includes('poll_interval_ms'), 'example 含路径A 预留键 poll_interval_ms（注释提醒）')
  assert(ex.includes('路径A 预留'), 'example dispatch 注释点名路径A gate')
  assert(ex.includes('auto_mode'), 'example 含 auto_mode 段（已 live，取消注释）')
  assert(/^auto_mode:/m.test(ex), 'auto_mode 段在 example 为非注释行（live）')
  assert(!ex.includes('fileWhitelist'), 'example 已移除无消费方的 fileWhitelist')
}
function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }

// ── 5. CLI 集成 ──
console.log('\n--- 5. CLI 集成（sillyspec config ...） ---')
function runCli(args) {
  try {
    const out = execFileSync(process.execPath, [binPath, 'config', ...args], {
      cwd: testDir, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 30_000,
    })
    return { code: 0, out }
  } catch (e) {
    return { code: e.status ?? 1, out: (e.stdout || '') + (e.stderr || '') }
  }
}
{
  const r = runCli([])
  assert(r.code === 0, `sillyspec config 退出 0（实际 ${r.code}）`)
  assert(r.out.includes('local.yaml 配置清单'), 'sillyspec config 输出标题')
  assert(r.out.includes('mcp.url'), 'sillyspec config 输出含 mcp.url')
}
{
  const r = runCli(['schema'])
  assert(r.code === 0, `sillyspec config schema 退出 0（实际 ${r.code}）`)
  assert(r.out.includes('生效'), 'config schema 输出含「生效」分组')
}
{
  const r = runCli(['schema', '--json'])
  assert(r.code === 0, `sillyspec config schema --json 退出 0（实际 ${r.code}）`)
  let parsed
  try { parsed = JSON.parse(r.out) } catch { parsed = null }
  assert(parsed !== null && Array.isArray(parsed.keys), 'config schema --json 输出合法 JSON 且含 keys')
  // D-005@v2 / task-11 验收：--json 机读口径下四值枚举 + 新 live 键可查
  const jsonTs = parsed && parsed.keys.find((k) => k.path === 'test_strategy')
  assert(
    jsonTs && Array.isArray(jsonTs.values) &&
      ['full', 'module', 'skip', 'evidence-auto'].every((v) => jsonTs.values.includes(v)),
    'config schema --json 的 test_strategy.values 含 full/module/skip/evidence-auto 四值'
  )
  const jsonBt = parsed && parsed.keys.find((k) => k.path === 'decisions.behind_threshold')
  assert(jsonBt && jsonBt.status === 'live', 'config schema --json 可查 decisions.behind_threshold 且 status=live')
}
{
  const r = runCli(['bogus'])
  assert(r.code !== 0, `sillyspec config bogus 非零退出（实际 ${r.code}）`)
  assert(r.out.includes('未知子命令'), 'config bogus 提示未知子命令')
}
{
  const r = runCli(['--help'])
  assert(r.code === 0, `sillyspec config --help 退出 0（实际 ${r.code}）`)
  assert(r.out.includes('用法'), 'config --help 含用法')
}

// ── 6. init 落盘 local.yaml.example（renderExample 经 init.js 接线）──
console.log('\n--- 6. init 生成 local.yaml.example ---')
{
  const tmp = mkdtempSync(join(tmpdir(), 'cfg-init-'))
  try {
    // 非交互 init（--tool claude，检测在干净目录跑）——直接调 doInstall 不导出，走 CLI。
    try {
      execFileSync(process.execPath, [binPath, 'init', '--tool', 'claude', '--dir', tmp], {
        cwd: testDir, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 60_000,
      })
    } catch (e) {
      // init 可能因 git 等打印 stderr，只要 example 落盘即可
    }
    const examplePath = join(tmp, '.sillyspec', 'local.yaml.example')
    assert(existsSync(examplePath), 'init 落盘 .sillyspec/local.yaml.example')
    if (existsSync(examplePath)) {
      const content = readFileSync(examplePath, 'utf8')
      assert(content.includes('# SillySpec local.yaml'), 'init 写出的 example 含标题')
      assert(content.includes('mcp:'), 'init 写出的 example 含 mcp 段')
      assert(content.includes('platform:'), 'init 写出的 example 含 platform 段')
    }
  } finally {
    try { rmSync(tmp, { recursive: true, force: true }) } catch {}
  }
}

console.log('\n==================================================')
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
console.log('==================================================')
if (failed > 0) process.exit(1)
