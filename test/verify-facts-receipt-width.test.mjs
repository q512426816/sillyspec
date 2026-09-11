/**
 * 回执行双宽度容收（坑 receipt-fullwidth-parse，2026-09-12 驾驭第十四批③，用户上一变更
 * 实证全角坑、本次手动避开后要求修根）+ 门禁快照环境预检（坑 gate-snapshot-env-mismatch
 * 二阶①）+ task 进行中标记（②）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { parseEvidenceSlots } from '../src/verify-facts-schema.js'
import { envDirsLinked } from '../src/run/gate-snapshot.js'

const tmpRoots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

const HEAD = '## 集成验证回执 [层：自述声明——CLI 一致性校验]'

test('回执行：全角 ｜ 分隔符（中文输入法手写形态）解析成功', () => {
  const md = HEAD + '\n- claim: 服务真实启动 ｜ command: uvicorn main:app ｜ exit: 0 ｜ log: logs/run.log\n'
  const r = parseEvidenceSlots(md)
  assert.equal(r.runtimeEvidence.length, 1, '全角分隔整行命中（旧正则 0 条 → integration-critical 误报）')
  assert.equal(r.runtimeEvidence[0].command, 'uvicorn main:app')
  assert.equal(r.runtimeEvidence[0].logPath, 'logs/run.log')
})

test('回执行：log 路径含空格/全角括号不再截断；行尾 ｜ 尾注剥除', () => {
  const md = HEAD + '\n'
    + '- claim: A | command: srv start | exit: 0 | log: logs/运行日志（第 1 次）.log\n'
    + '- claim: B | command: lint | exit: 0 | log: logs/lint.log ｜ 重跑第 2 次确认\n'
  const r = parseEvidenceSlots(md)
  assert.equal(r.runtimeEvidence[0].logPath, 'logs/运行日志（第 1 次）.log',
    '含空格+全角括号路径完整保留（旧 [^\\s|+] 截成「logs/运行日志（第」→ 日志不存在假红）')
  assert.equal(r.runtimeEvidence[1].logPath, 'logs/lint.log', '行尾尾注剥除')
})

test('回执行：半角形态零回归 + 占位不命中', () => {
  const md = HEAD + '\n'
    + '- claim: A | command: x | exit: 0 | log: l.log\n'
    + '- claim: <待填：一句话> | command: <待填：命令> | exit: <待填：0 或非 0> | log: <待填：日志路径>\n'
  const r = parseEvidenceSlots(md)
  assert.equal(r.runtimeEvidence.length, 1, '半角命中 + 占位（非数字 exit）不命中')
})

test('envDirsLinked：主仓有而快照缺 → 命中清单；齐全/主仓本无 → 空', () => {
  const cwd = mk('env-'); const snap = mk('env-snap-')
  mkdirSync(join(cwd, 'node_modules'), { recursive: true })
  assert.deepEqual(envDirsLinked(cwd, snap), ['node_modules'], '主仓有快照缺 → 作废信号')
  mkdirSync(join(snap, 'node_modules'), { recursive: true })
  assert.deepEqual(envDirsLinked(cwd, snap), [], '链接齐全 → 空')
  const bare = mk('env-bare-')
  assert.deepEqual(envDirsLinked(bare, snap), [], '主仓本无环境目录 → 空（不算缺陷）')
})
