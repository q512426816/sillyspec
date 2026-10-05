/**
 * 2026-10-05-flow-tail-polish 回归：轻量道收口与查询四摩擦点
 *
 * 三轮轻量道实测（flow-help-status / input-teach-copyable / input-teach-non-src）发现：
 * ① flow done 归档后 git 半成品（归档新目录 untracked、knowledge 未暂存、无清单）
 * ② 实测面对账数字口径不透明（deps 12 + FR 绑定 52 = 53 并集去重语义未说明）
 * ③ 重入 flow start 知识注入消失（digest input:null，「语料未命中」误导）
 * ④ flow status 查不存在变更 exit 0（脚本无法区分不存在）
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CLI = join(ROOT, 'src', 'index.js')
const read = (p) => readFileSync(join(ROOT, p), 'utf8')

/** 造临时 git 仓 + local.yaml（thin 轻量跑道）。 */
function makeRepo() {
  const cwd = mkdtempSync(join(tmpdir(), 'ftp-'))
  const run = (args) => execFileSync('git', args, { cwd, stdio: 'pipe' }).toString().trim()
  run(['init', '-q'])
  run(['config', 'user.email', 't@t'])
  run(['config', 'user.name', 't'])
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'project:\n  type: generic\ncommands:\n  test: "node -e 0"\nflow:\n  mode: thin\n')
  writeFileSync(join(cwd, 'base.txt'), 'base\n')
  run(['add', '.'])
  run(['commit', '-q', '-m', 'base'])
  return { cwd }
}

const cli = (cwd, args) => spawnSync(process.execPath, [CLI, ...args], {
  cwd, encoding: 'utf8', timeout: 180_000,
  env: { ...process.env, SILLYSPEC_WATCHER: '0', SILLYSPEC_SESSION_ID: 'ftp-test' },
})

test('FR-01 归档补暂存含未跟踪归档目录 + knowledge 待办清单提示（源码级）', () => {
  const src = read('src/run/complete-handlers.js')
  // untracked（??）归档目录分支在场——归档新目录文件级补暂存
  assert.ok(src.includes("x === '?'") && src.includes("y === '?'"), '探测块含 untracked 状态分支')
  assert.ok(/archive['"`/]+ ?\+ ?changeName|archive\/' \+ changeName/.test(src), 'untracked 分支限本变更 archive/<me>/')
  // knowledge 未暂存 → 打印待办清单提示（不自动暂存）
  assert.ok(src.includes('knowledge'), '探测块覆盖 knowledge 路径')
  assert.ok(src.includes('归档提交待办'), 'knowledge 待提交清单提示在场')
})

test('FR-02 实测面对账文案含并集去重语义（源码级）', () => {
  const src = read('src/verify-postcheck.js')
  const line = src.split('\n').find((l) => l.includes('动态测试子集（缺省）'))
  assert.ok(line, '动态测试子集对账行在场')
  assert.ok(line.includes('并集去重'), '子集数注明并集去重语义')
})

test('FR-03 flow-state 落 input 字段 + 重入回填逻辑（行为级 + 源码级）', () => {
  const { cwd } = makeRepo()
  const s = cli(cwd, ['flow', 'start', '--change', '2026-09-01-ftp-i', '--input', '任务动机\n成功标准：\n- 行为 X'])
  assert.equal(s.status, 0, `start 应成功: ${s.stderr}`)
  const state = readFileSync(join(cwd, '.sillyspec', 'changes', '2026-09-01-ftp-i', 'flow-state.yaml'), 'utf8')
  assert.ok(/input:/.test(state), 'flow-state.yaml 落 input 字段')
  // 源码级：重入 digest 回填（st.input ?? proposal 转写剥前缀）
  const flowSrc = read('src/flow.js')
  assert.ok(/input: ?(st\.input|resumeInput)/.test(flowSrc), '重入 digest 回填 input')
  assert.ok(flowSrc.includes('任务原话转写：'), 'proposal 动机转写回退路径在场')
  rmSync(cwd, { recursive: true, force: true })
})

test('FR-04 flow status 不存在 exit 1 / 在场 exit 0（行为级）', () => {
  const { cwd } = makeRepo()
  const miss = cli(cwd, ['flow', 'status', '--change', '2026-09-01-ftp-none'])
  assert.equal(miss.status, 1, `不存在应 exit 1（实际 ${miss.status}）`)
  assert.ok((miss.stdout + miss.stderr).includes('变更不存在'), '保留「变更不存在」文案')
  const s = cli(cwd, ['flow', 'start', '--change', '2026-09-01-ftp-ok', '--input', '任务动机\n成功标准：\n- 行为 X'])
  assert.equal(s.status, 0, `start 应成功: ${s.stderr}`)
  const hit = cli(cwd, ['flow', 'status', '--change', '2026-09-01-ftp-ok'])
  assert.equal(hit.status, 0, `在场应 exit 0（实际 ${hit.status}）`)
  rmSync(cwd, { recursive: true, force: true })
})
