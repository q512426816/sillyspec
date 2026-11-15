/**
 * 辅助阶段豁免变更吸附（2026-11-15-auxiliary-scan-no-stick）。
 * FR-01/FR-02：源码断言（豁免集边界）+ 本仓活环境集成（活跃变更在场跑 scan 不再被
 * 轻量跑道升厚门拦截——本测试运行时本仓通常有活跃变更在场，恰是回归环境）。
 * FR-03（multi-agent-platform 真机）走 flow done 集成回执，不在此文件。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const cmdSrc = readFileSync(fileURLToPath(new URL('../src/run/command.js', import.meta.url)), 'utf8')

test('scan/explore 豁免吸附：effectiveChange 置空（源码断言）', () => {
  const m = cmdSrc.match(/NO_CHANGE_AUXILIARY_STAGES = new Set\(\[([^\]]*)\]\)/)
  assert.ok(m, '豁免集常量在场')
  const set = m[1]
  assert.match(set, /'scan'/)
  assert.match(set, /'explore'/)
  // 豁免生效点：effectiveChange 三元分支引用豁免集
  assert.match(cmdSrc, /NO_CHANGE_AUXILIARY_STAGES\.has\(stageName\)\s*\n\s*\?\s*null/)
})

test('quick/archive 不豁免：路由行为零变化（豁免集不含二者）', () => {
  const m = cmdSrc.match(/NO_CHANGE_AUXILIARY_STAGES = new Set\(\[([^\]]*)\]\)/)
  const set = m[1]
  assert.ok(!set.includes("'quick'"), 'quick 保持变更吸附（会话锚定语义）')
  assert.ok(!set.includes("'archive'"), 'archive 保持变更吸附（收口锚定语义）')
})

test('本仓活跃变更在场跑 run scan --status 不再被 ⛔ 升厚门拦截（活环境集成）', () => {
  const bin = fileURLToPath(new URL('../bin/sillyspec.js', import.meta.url))
  let out = ''
  let code = 0
  try {
    out = execFileSync(process.execPath, [bin, 'run', 'scan', '--status'], { encoding: 'utf8', timeout: 30_000, cwd: fileURLToPath(new URL('../', import.meta.url)) })
  } catch (e) {
    out = String((e && e.stdout) || '') + String((e && e.stderr) || '')
    code = e.status ?? 1
  }
  // 修复前（活跃变更在场）：⛔ 本变更在轻量跑道上 + exit 2；修复后：scan 状态输出（exit 0 或正常非 2）
  assert.ok(!out.includes('本变更在轻量跑道上'), '不再输出升厚门拦截')
  assert.notEqual(code, 2, '不再 exit 2 拒跑')
})
