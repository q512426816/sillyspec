/**
 * 平台模式产物落点指针（坑 platform-docs-dual-location，2026-09-15 EHS 生产实证）：
 * 平台模式 specRoot/runtimeRoot 落 daemon 侧目录，工作树 .sillyspec/ 里没有（或只剩旧变更
 * 残留）——人类在工作树找变更文档扑空，只有平台 changes files API 能读。阶段 --done 完成
 * 时在工作树 .sillyspec/ 落 PLATFORM-DOCS-POINTER.md（物理根路径+变更文档清单+mtime）。
 *
 * 锁定语义：
 *   - 本地模式（无 platformOpts）→ 零行为（不写文件）
 *   - 自指回环 specRoot（repo-native junction 指回 cwd/.sillyspec）→ 不写（同 isPlatformMode 豁免口径）
 *   - 平台模式 → 写指针：specRoot/runtimeRoot/workspaceId/变更 .md 清单+tasks/ 计数
 *   - specRoot 有、变更目录缺 → 仍写头部（无文档段），不抛
 *   - fail-soft：写失败 warn 不抛（返回 written:false）
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { writePlatformDocsPointer } from '../src/run/shared.js'

const tmpRoots = []
function mk(prefix) { const d = mkdtempSync(join(tmpdir(), prefix)); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

function mkChangeDocs(specRoot, change) {
  const dir = join(specRoot, 'changes', change)
  mkdirSync(join(dir, 'tasks'), { recursive: true })
  writeFileSync(join(dir, 'design.md'), '# design\n')
  writeFileSync(join(dir, 'verify-result.md'), '# verify\n')
  writeFileSync(join(dir, 'tasks', 'task-01.md'), '# t1\n')
  return dir
}

test('本地模式（无 platformOpts）→ 零行为不写文件', () => {
  const cwd = mk('pdp-local-')
  const r = writePlatformDocsPointer(cwd, 'some-change', {}, 'verify')
  assert.equal(r.written, false)
  assert.equal(r.reason, 'local-mode')
  assert.equal(existsSync(join(cwd, '.sillyspec', 'PLATFORM-DOCS-POINTER.md')), false, '本地模式不生成指针')
})

test('自指回环 specRoot（指回 cwd/.sillyspec）→ 不写（isPlatformMode 豁免同口径）', () => {
  const cwd = mk('pdp-selfref-')
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true }) // 真实 junction 场景本地 .sillyspec 必在（realpath 才可解析）
  const r = writePlatformDocsPointer(cwd, 'c1', { specRoot: join(cwd, '.sillyspec') }, 'verify')
  assert.equal(r.written, false)
  assert.equal(r.reason, 'self-referential')
})

test('平台模式 → 写指针：物理根+workspaceId+变更文档清单+tasks 计数', () => {
  const cwd = mk('pdp-plat-ws-')
  const specRoot = mk('pdp-plat-spec-')
  const runtimeRoot = mk('pdp-plat-rt-')
  mkChangeDocs(specRoot, '2026-09-15-demo')
  const r = writePlatformDocsPointer(cwd, '2026-09-15-demo', {
    specRoot, runtimeRoot, workspaceId: 'ws-123',
  }, 'verify')
  assert.equal(r.written, true, `应写入（reason=${r.reason}）`)
  const p = join(cwd, '.sillyspec', 'PLATFORM-DOCS-POINTER.md')
  assert.ok(existsSync(p), '指针落在工作树 .sillyspec/ 下')
  const text = readFileSync(p, 'utf8')
  assert.match(text, new RegExp(specRoot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), '含 specRoot 物理路径')
  assert.match(text, new RegExp(runtimeRoot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), '含 runtimeRoot 物理路径')
  assert.match(text, /ws-123/, '含 workspaceId')
  assert.match(text, /verify 阶段完成/, '含触发阶段与时间戳')
  assert.match(text, /2026-09-15-demo/, '含变更名')
  assert.match(text, /design\.md（mtime/, '文档清单含 design.md+mtime')
  assert.match(text, /verify-result\.md（mtime/, '文档清单含 verify-result.md+mtime')
  assert.match(text, /tasks\/（1 张任务卡）/, 'tasks 目录计数')
  assert.match(text, /不是本仓权威数据面/, '开头声明工作树非权威面')
})

test('平台模式但变更目录缺 → 仍写头部（无文档段）不抛', () => {
  const cwd = mk('pdp-nochg-ws-')
  const specRoot = mk('pdp-nochg-spec-')
  const r = writePlatformDocsPointer(cwd, 'no-such-change', { specRoot }, 'plan')
  assert.equal(r.written, true)
  const text = readFileSync(join(cwd, '.sillyspec', 'PLATFORM-DOCS-POINTER.md'), 'utf8')
  assert.match(text, /no-such-change/)
  assert.doesNotMatch(text, /## 本变更文档/, '无变更文档段')
})

test('runtimeRoot-only 平台模式（specRoot 缺）→ 仍写指针（isPlatformMode 判定式同款）', () => {
  const cwd = mk('pdp-rt-only-')
  const runtimeRoot = mk('pdp-rt-only-rt-')
  const r = writePlatformDocsPointer(cwd, null, { runtimeRoot }, 'scan')
  assert.equal(r.written, true)
  const text = readFileSync(join(cwd, '.sillyspec', 'PLATFORM-DOCS-POINTER.md'), 'utf8')
  assert.match(text, /（未指定）/, 'specRoot 行如实标注未指定')
})
