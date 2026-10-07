/**
 * flow done 提交面夹带嫌疑 advisory（坑 parallel-session-stale-snapshot-carried-in-commit）
 *
 * 实证（2026-09-26，main commit 304eba982）：daemon 遥测主题提交整体夹带并行会话旧分叉
 * page.tsx，整文件覆盖等价于静默回滚 main 已落地三处功能——git 无冲突、聚焦测试不覆盖
 * 挂载面，绿灯直过，直到线上用户发现卡片消失。
 *
 * 修复断言（src/flow.js patch 子步）：
 * ① 提交面含未被本变更声明面（design 文件变更清单 ∪ requirements 测试绑定）提及的交付
 *    文件 → 「夹带嫌疑」警告点名该文件（声明的 work.txt 不点名）；
 * ② 声明面全空（无清单无绑定）→ 降为「无声明面」软提示，不指认夹带；
 * ③ advisory 不阻断收口（exit 0、归档照常）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CLI = join(ROOT, 'src', 'index.js')

function makeRepo() {
  const cwd = mkdtempSync(join(tmpdir(), 'fp-carry-'))
  const run = (args) => execFileSync('git', args, { cwd, stdio: 'pipe' }).toString().trim()
  run(['init', '-q'])
  run(['config', 'user.email', 't@t'])
  run(['config', 'user.name', 't'])
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'project:\n  type: generic\ncommands:\n  test: "node -e \\"0\\""\nflow:\n  mode: thin\n')
  writeFileSync(join(cwd, 'base.txt'), 'base\n')
  run(['add', '.'])
  run(['commit', '-q', '-m', 'base'])
  return { cwd, run }
}

function cli(cwd, args) {
  return spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8', timeout: 180_000, env: { ...process.env, SILLYSPEC_WATCHER: '0' } })
}

function fillSlots(cwd, change) {
  const base = join(cwd, '.sillyspec', 'changes', change)
  const dp = join(base, 'design.md')
  const dText = readFileSync(dp, 'utf8')
  if (/<!--AGENT:槽\d+/.test(dText)) {
    writeFileSync(dp, dText.replace(/(<!--AGENT:槽\d+[^\n]*-->)/g, '$1\n不适用：夹带告警夹具'))
    writeFileSync(join(base, 'requirements.md'), readFileSync(join(base, 'requirements.md'), 'utf8')
      .replace(/(<!--AGENT:FR区[^\n]*-->)/g, '$1\n### FR-01: 夹具行为\nGiven 轻量变更在跑\nWhen flow done 执行\nThen 全部子步通过')
      .replace(/(<!--AGENT:测试绑定FR-\d+[^\n]*-->)/g, '$1\n不适用：夹带告警夹具——无独立测试面'))
  } else {
    writeFileSync(dp, dText.replace(/^(本变更怎么解决问题|动了哪些函数|1\. 乱序|2\. 并发写|3\. 切换|4\. 作用域|本方案最大的风险)([^\n]*)$/gm, '$&\n不适用：夹带告警夹具'))
    writeFileSync(join(base, 'requirements.md'), readFileSync(join(base, 'requirements.md'), 'utf8')
      .replace(/^- （待撰写.*$/gm, '- 系统 MUST 达成该条标准行为（夹带告警夹具）')
      .replace(/^FR-\d{2}: （待填.*$/gm, (m) => m.split(':')[0] + ': 不适用：夹带告警夹具——无独立测试面'))
  }
  // spec 断点批准（v2 起草变更的 done 前提——用户动作，夹具代跑）
  const ap = cli(cwd, ['flow', 'approve', '--change', change])
  assert.equal(ap.status, 0, `flow approve 失败: ${ap.stdout}\n${ap.stderr}`)
}

test('① 夹带嫌疑：提交面含未声明交付文件 → 点名警告；声明文件不点名；不阻断收口', () => {
  const { cwd } = makeRepo()
  const change = '2026-09-01-carry-suspect-a'
  assert.equal(cli(cwd, ['flow', 'start', '--change', change, '--input', '加一个文件\n成功标准：\n- work.txt 生成且 flow done 全绿', '--no-review']).status, 0)
  fillSlots(cwd, change)
  // design §6 自声明 work.txt（声明面锚点——坑 thin-flow-freeze-foreign-declared-hijack 绕过同款）
  const dp = join(cwd, '.sillyspec', 'changes', change, 'design.md')
  writeFileSync(dp, readFileSync(dp, 'utf8') + '\n## 文件变更清单\n\n- work.txt\n')

  // 干活提交 work.txt + 模拟并行会话在途文件被同一提交夹带（坑现场形态）
  writeFileSync(join(cwd, 'work.txt'), 'done\n')
  writeFileSync(join(cwd, 'foreign-page.tsx'), '// 并行会话旧分叉快照\nexport {}\n')
  execFileSync('git', ['add', 'work.txt', 'foreign-page.tsx'], { cwd, stdio: 'pipe' })
  execFileSync('git', ['commit', '-q', '-m', 'work（夹带 foreign-page.tsx）（task-01）'], { cwd, stdio: 'pipe' })

  const s2 = cli(cwd, ['flow', 'done', '--change', change])
  assert.equal(s2.status, 0, `done 应 advisory 不阻断: ${s2.stdout}\n${s2.stderr}`)
  const carryLine = (s2.stdout + s2.stderr).split('\n').find((l) => l.includes('夹带嫌疑'))
  assert.ok(carryLine, '夹带嫌疑警告在场')
  assert.ok(carryLine.includes('foreign-page.tsx'), `点名夹带文件：${carryLine}`)
  assert.ok(!carryLine.includes('work.txt'), `声明的 work.txt 不点名：${carryLine}`)
  assert.equal(existsSync(join(cwd, '.sillyspec', 'changes', 'archive')), true, '归档照常')
  rmSync(cwd, { recursive: true, force: true })
})

test('② 声明面全空：不指认夹带，降为「无声明面」软提示', () => {
  const { cwd } = makeRepo()
  const change = '2026-09-02-carry-suspect-b'
  assert.equal(cli(cwd, ['flow', 'start', '--change', change, '--input', '加一个文件\n成功标准：\n- work.txt 生成', '--no-review']).status, 0)
  fillSlots(cwd, change)
  writeFileSync(join(cwd, 'work.txt'), 'done\n')
  execFileSync('git', ['add', 'work.txt'], { cwd, stdio: 'pipe' })
  execFileSync('git', ['commit', '-q', '-m', 'work (task-01)'], { cwd, stdio: 'pipe' })
  const s2 = cli(cwd, ['flow', 'done', '--change', change])
  assert.equal(s2.status, 0, `done 不阻断: ${s2.stdout}\n${s2.stderr}`)
  const out = s2.stdout + s2.stderr
  assert.ok(!out.includes('夹带嫌疑'), '无声明面时不指认夹带')
  assert.ok(out.split('\n').some((l) => l.includes('无任何文件声明面')), '降为软提示')
  rmSync(cwd, { recursive: true, force: true })
})
