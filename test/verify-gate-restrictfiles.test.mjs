/**
 * verify-gate-restrictfiles.test.mjs — verify 测试对账门 restrictFiles 接线（2026-09-26）
 *
 * 覆盖验收面：
 *   ① 接线钉：gates.js verify 门的 runVerifyTestCheck 调用带 restrictFiles（与 quick 门同形），
 *      且空清单不传（restrict 空数组=假 skip 面而非全量硬门）；
 *   ② 长会话税提示钉：verify 步骤渲染含新会话续跑建议。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

test('① gates.js verify 门 restrictFiles 接线钉（非空才传）', () => {
  const src = readFileSync(join(ROOT, 'src/run/gates.js'), 'utf8')
  const i = src.indexOf('testCheck = runVerifyTestCheck({ cwd: gateCwd')
  assert.ok(i > 0, 'verify 门的 runVerifyTestCheck 调用应可定位')
  const call = src.slice(i, src.indexOf('printVerifyTestCheck', i))
  assert.ok(call.includes('restrictFiles'), `调用应含 restrictFiles 展开（实际：${call.slice(0, 140)}）`)
  assert.ok(src.includes('resolveVerifyChangedFiles(cwd, changeName, null, { includeWorkingTree: true, specBase: gateSpecBase })'), '文件面解析与 lint scope（:1135）同源口径')
  assert.ok(src.includes('_restrict.length > 0 ? { restrictFiles: _restrict } : {}'), '空清单不传（防 restrict 空数组制造假 skip）')
})

test('② verify 渲染长会话税提示钉', () => {
  const src = readFileSync(join(ROOT, 'src/stages/verify.js'), 'utf8')
  assert.ok(src.includes('长会话税提示'), '提示标题在场')
  assert.ok(src.includes('新开会话跑 verify'), '新会话续跑建议在场')
})
