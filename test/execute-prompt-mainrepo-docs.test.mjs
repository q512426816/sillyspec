/**
 * execute 模块文档主仓写入铁律（坑 module-docs-worktree-copy-leak，2026-09-10 驾驭小结第四批①，
 * 用户实证：task-13 子代理把模块文档写进 worktree 的 .sillyspec 副本而非主仓，归档阶段靠
 * checkout 补救——原「只写主仓」规则埋在长 prompt 尾部一句带过，子代理未遵守）。
 *
 * 锁定（源码扫描形态，与 execute-run-dir-fail-loud 的扫描断言同范式——prompt 是渲染数据，
 * 纯文本断言即行为契约）：
 *   - Wave prompt「模块文档欠账」段：欠账处理指引原地重申铁律（子代理照着写的那段），
 *     含 {SPEC_ROOT} 占位 + 绝不写副本 + cleanup 蒸发后果
 *   - 派发 prompt「注意」段：升格 ⚠️ 铁律 + 枚举产物类型（sidecar 明示）+ 子代理透传要求
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'node:url'

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'stages', 'execute.js'), 'utf8')

test('Wave prompt 欠账段：模块卡/sidecar 主仓铁律原地重申（含路径占位与蒸发后果）', () => {
  const debtIdx = src.indexOf('### 模块文档欠账（CLI 算事实）')
  assert.ok(debtIdx > 0, '找到「模块文档欠账」段')
  const section = src.slice(debtIdx, debtIdx + 900)
  assert.ok(section.includes('铁律'), '欠账段内含铁律字样')
  assert.ok(section.includes('{SPEC_ROOT}/docs/'), '铁律给出主仓绝对路径占位形态')
  assert.ok(section.includes('绝不') && section.includes('副本'), '明示绝不写副本')
  assert.ok(section.includes('cleanup') && section.includes('蒸发'), '写明后果（副本随 cleanup 蒸发，主仓读不到）')
})

test('派发 prompt 注意段：spec 产物主仓铁律升格（sidecar 明示 + 子代理透传要求）', () => {
  // 派发 prompt 的注意段以「蓝图文件（tasks.md …」开头——用该唯一锚定位（文件内另有多个「### 注意」）
  const noteIdx = src.indexOf('蓝图文件（tasks.md')
  assert.ok(noteIdx > 0, '定位派发 prompt 注意段（蓝图文件锚）')
  const section = src.slice(noteIdx, noteIdx + 900)
  assert.ok(section.includes('铁律'), '注意段升格铁律')
  assert.ok(section.includes('module-impact.md') && section.includes('knowledge') && section.includes('sidecar'),
    '枚举产物类型（module-impact / knowledge / sidecar）')
  assert.ok(section.includes('子代理') && section.includes('绝对路径'), '要求子代理 prompt 透传主仓绝对路径')
  assert.ok(section.includes('checkout 副本') || section.includes('checkout 出来'), '点破 worktree 内 .sillyspec 是 checkout 副本')
})
