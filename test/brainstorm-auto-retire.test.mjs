/**
 * brainstorm-auto-retire.test.mjs — 自动道删除（2026-10-14-brainstorm-auto-retire）
 *
 * 用户裁决删除 brainstorm-auto 自动道（原型规则链原生盲区：4 步 artifact-first 表无原型
 * 分级/真码口径，且双轨步骤表机制曾互踩）。锁三面：
 *   ① run auto 新变更 brainstorm 阶段种主模式 8 步表（通用 ensureStageSteps 路径）；
 *   ② 存量 4 步 auto 表（首名「进度确认与上下文加载」）触达 → 退役报错 + 进度未重种；
 *   ③ 现行文件零悬挂引用（src/test/docs/prompt 无 brainstorm-auto）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isRetiredAutoBrainstormTable } from '../src/run/shared.js'
import { ProgressManager } from '../src/progress.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CLI = join(ROOT, 'src', 'index.js')
const AUTO_TABLE = ['进度确认与上下文加载', '需求分析与方案设计', '生成设计产物', '生成规范文件']

function makeRepo() {
  const cwd = mkdtempSync(join(tmpdir(), 'bar-'))
  const g = (a) => execFileSync('git', a, { cwd, stdio: 'pipe' })
  g(['init', '-q']); g(['config', 'user.email', 't@t']); g(['config', 'user.name', 't'])
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'project:\n  type: generic\ncommands:\n  test: "node exit0.js"\n')
  writeFileSync(join(cwd, 'base.txt'), 'b\n')
  g(['add', '.']); g(['commit', '-q', '-m', 'b'])
  const cli = (args) => spawnSync(process.execPath, [CLI, ...args], {
    cwd, encoding: 'utf8', timeout: 120_000,
    env: { ...process.env, SILLYSPEC_WATCHER: '0' },
  })
  const pm = new ProgressManager({ specDir: join(cwd, '.sillyspec') })
  const readProgress = (change) => pm.read(cwd, change)
  const writeProgress = (change, p) => pm._write(cwd, p, change)
  // 清理前关模块级 DB 池句柄（Windows 打开中的 SQLite 文件锁目录，rmSync 会 EPERM）
  const cleanup = () => {
    try { for (const db of ProgressManager._dbPool.values()) db.close() } catch { /* best-effort */ }
    try { ProgressManager._dbPool.clear() } catch { /* best-effort */ }
    rmSync(cwd, { recursive: true, force: true })
  }
  return { cwd, cli, readProgress, writeProgress, cleanup }
}

test('前置：退役形态判定纯函数', () => {
  assert.ok(isRetiredAutoBrainstormTable(AUTO_TABLE.map(n => ({ name: n }))), '4 步 auto 表形态命中')
  assert.ok(!isRetiredAutoBrainstormTable([{ name: '进度确认' }]), '主模式表不命中')
  assert.ok(!isRetiredAutoBrainstormTable(null), '空表安全')
})

test('① run auto 新变更种主模式 8 步表', () => {
  const { cli, readProgress, cleanup } = makeRepo()
  const change = '2026-10-14-bar-1'
  const s = cli(['run', 'auto', '--change', change, '--input', '需求 X\n成功标准：\n- 行为 A'])
  assert.equal(s.status, 0, s.stderr)
  const p = readProgress(change)
  assert.ok(p, '进度已落盘')
  const steps = p?.stages?.brainstorm?.steps
  assert.ok(Array.isArray(steps), `brainstorm 步骤表已种：${JSON.stringify(steps || null).slice(0, 120)}`)
  assert.equal(steps[0]?.name, '进度确认', `首步为主模式「进度确认」（实际 ${steps[0]?.name}）`)
  assert.equal(steps.length, 8, `主模式 8 步表（实际 ${steps.length}）`)
  cleanup()
})

test('② 存量 auto 表触达 → 退役报错且进度未重种', () => {
  const { cli, readProgress, writeProgress, cleanup } = makeRepo()
  const change = '2026-10-14-bar-2'
  // 先建主模式进度（合法路径），再手工替换为存量 auto 表形态（模拟 2026-10-14 前的自动道变更）
  assert.equal(cli(['run', 'brainstorm', '--change', change, '--input', '需求 X\n成功标准：\n- 行为 A']).status, 0)
  const p0 = readProgress(change)
  assert.ok(p0?.stages?.brainstorm?.steps, '主模式进度已种')
  p0.stages.brainstorm.steps = AUTO_TABLE.map(n => ({ name: n, status: 'pending' }))
  writeProgress(change, p0)
  // run brainstorm 渲染路径：退役拒绝
  const r1 = cli(['run', 'brainstorm', '--change', change])
  assert.notEqual(r1.status, 0, '渲染路径必须非零退出')
  assert.match(r1.stderr + r1.stdout, /已退役的自动道/, '退役报错文案在场')
  assert.match(r1.stderr + r1.stdout, /--reset（重种主模式/, '恢复指引在场（--reset 重种主模式表）')
  // --done 推进路径：同样拒绝
  const r2 = cli(['run', 'brainstorm', '--change', change, '--done', '--output', 'x'])
  assert.notEqual(r2.status, 0, '推进路径必须非零退出')
  assert.match(r2.stderr + r2.stdout, /已退役的自动道/, '推进路径退役报错在场')
  // 进度未被重种：仍是 4 步 auto 表
  const p1 = readProgress(change)
  assert.equal(p1?.stages?.brainstorm?.steps?.length, 4, '进度未被静默重种（仍 4 步）')
  // 恢复出路真实可用：--reset 重种主模式表（resetStage 内联 getStageSteps 主模式定义）
  const r3 = cli(['run', 'brainstorm', '--change', change, '--reset'])
  assert.equal(r3.status, 0, `reset 应成功: ${r3.stderr}`)
  const p2 = readProgress(change)
  assert.equal(p2?.stages?.brainstorm?.steps?.length, 8, 'reset 后重种主模式 8 步表')
  assert.equal(p2?.stages?.brainstorm?.steps?.[0]?.name, '进度确认', 'reset 后首步为主模式「进度确认」')
  cleanup()
})

test('③ 现行文件零悬挂引用（src/test/docs/prompt）', () => {
  const g = (args) => execFileSync('git', ['-C', ROOT, ...args], { encoding: 'utf8' })
  const tracked = g(['ls-files']).split('\n').filter(Boolean)
  const offenders = []
  for (const f of tracked) {
    if (!/^(src|test|docs\/prompt)\//.test(f)) continue
    if (f === 'docs/prompt/_extracted.json' || f.endsWith('.superseded')) continue
    // 自身豁免：本文件头注释记载退役历史（未跟踪时不在扫描面、提交后自扫命中——快照重放实证）
    if (f === 'test/brainstorm-auto-retire.test.mjs') continue
    let text
    try { text = readFileSync(join(ROOT, f), 'utf8') } catch { continue }
    for (const line of text.split('\n')) {
      if (!line.includes('brainstorm-auto')) continue
      // 退役标记行放行：变更名锚（2026-10-14-brainstorm-auto-retire）与退役/已删除注记本身
      // 合法存在；live 引用（import/链接/路由）必须为零
      if (/brainstorm-auto-retire|退役|已删除/.test(line)) continue
      offenders.push(`${f}: ${line.trim().slice(0, 80)}`)
    }
  }
  assert.deepEqual(offenders, [], `现行文件不得残留 brainstorm-auto 活引用：\n${offenders.join('\n')}`)
})
