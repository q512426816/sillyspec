/**
 * 2026-10-05-bind-unbind-help 回归：tests 用法行含 --bind/--unbind 语义说明
 *
 * 背景（主清单项 4）：--bind 新增绑定行不替换旧行（row_id 显式或自动 manual:*）、
 * --unbind 按 --row-id（或 --tests 路径）删行——用法行只列 flag 名不说明语义，只能试。
 *
 * 锁定：
 *   ① 用法行含语义短注（追加新行不替换 / 按 --row-id 或 --tests 删行 / 缺省只读展示）
 *   ② 语义与实现一致锚：bind 行构造为 append（旧行不删）、unbind 删行 id 来源两口径
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..')
const src = readFileSync(join(ROOT, 'src', 'index.js'), 'utf8')

test('① 用法行含 --bind/--unbind 语义说明', () => {
  // 源码面匹配：fail 字符串里是字面 \n（两字符），输出时才成换行——正则按源码文本匹配
  const m = /用法: sillyspec tests[^\n]*\\n\s*语义：--bind 追加一条新绑定行（不替换旧行；row_id 缺省自动生成 manual:\*）；--unbind 按 --row-id <id> 删行（或 --tests 路径反查）；不带 bind\/unbind 只读展示/.exec(src)
  assert.ok(!!m, 'tests 用法行带语义短注（与实现同口径）')
})

test('② 语义与实现一致锚（append 构造 + 删行 id 两口径）', () => {
  assert.ok(src.includes("const row = { anchor, row_id: rowId || `manual:"), 'bind 行构造 append 语义锚（row_id 缺省自动 manual:*）')
  assert.ok(src.includes("--unbind 须配 --row-id <id> 或 --tests"), 'unbind 删行 id 来源两口径锚（--row-id / --tests）')
})
