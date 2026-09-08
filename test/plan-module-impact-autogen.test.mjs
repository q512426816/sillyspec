/**
 * plan --done 自动生成 module-impact.md 首版（刀②，ql-20260908-010-8f3d）。
 *
 * generatePlanModuleImpactFirstVersion：声明来源（design 文件变更清单 main 段）×
 * module-map 前缀匹配 → 落盘骨架；已存在不覆盖；scale=small / 无清单 / 无 module-map
 * 降级 skipped 不阻断（缺失仍由 validatePlanOutputs 统一报，口径与旧手写路径一致）。
 *
 * 覆盖：
 *   generated：命中归类 + 未匹配章节 + 更新结果表 pending 行
 *   idempotent：已存在不覆盖
 *   scale-small / no-design / no-declared-files / no-module-map → skipped
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, existsSync, writeFileSync, readFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { generatePlanModuleImpactFirstVersion } from '../src/stages/plan-postcheck.js'

const MODULE_MAP_YAML = [
  'schema_version: 2',
  'modules:',
  '  core:',
  '    paths:',
  '      - src/core/',
  '  web:',
  '    paths:',
  '      - src/web/ui.js',
  '',
].join('\n')

function makeProject({ withMap = true } = {}) {
  const cwd = mkdtempSync(join(tmpdir(), 'sillyspec-mi-autogen-'))
  if (withMap) {
    const mapDir = join(cwd, '.sillyspec', 'docs', 'proj', 'modules')
    mkdirSync(mapDir, { recursive: true })
    writeFileSync(join(mapDir, '_module-map.yaml'), MODULE_MAP_YAML)
  }
  return cwd
}

function writeDesign(cwd, change, body, frontmatter = 'scale: large') {
  const dir = join(cwd, '.sillyspec', 'changes', change)
  mkdirSync(dir, { recursive: true })
  const fm = frontmatter ? `---\n${frontmatter}\n---\n\n` : ''
  writeFileSync(join(dir, 'design.md'), `${fm}${body}`)
  return dir
}

const DESIGN_WITH_LIST = [
  '## 文件变更清单',
  '',
  '- src/core/engine.js',
  '- src/web/ui.js',
  '- docs/orphan.md',
  '',
].join('\n')

test('generated：design 清单归类命中 + 未匹配入专章 + 更新结果表 pending', async () => {
  const cwd = makeProject()
  const changeDir = writeDesign(cwd, '2026-09-08-knife2', DESIGN_WITH_LIST)

  const r = await generatePlanModuleImpactFirstVersion(changeDir, cwd)

  assert.equal(r.status, 'generated')
  assert.equal(r.matchedCount, 2)
  assert.equal(r.unmatchedCount, 1)
  const md = readFileSync(join(changeDir, 'module-impact.md'), 'utf8')
  assert.ok(md.includes('## 模块影响矩阵'), '含「模块影响矩阵」章节（archive contains_sections 契约）')
  assert.ok(md.includes('## 未匹配文件'), '含「未匹配文件」章节')
  assert.ok(md.includes('| core | `src/core/engine.js` |'), '命中模块按 map 前缀归类')
  assert.ok(md.includes('| web | `src/web/ui.js` |'), '文件条目精确命中')
  assert.ok(md.includes('`docs/orphan.md`'), '未命中文件入未匹配章节')
  assert.ok(md.includes('## 更新结果'), '含「更新结果」表骨架（verify/archive 死信门目标）')
  assert.ok(md.includes('| `modules/core.md` | 更新core模块卡（本次变更涉及） | pending |'), '命中模块卡行 pending')
})

test('idempotent：已存在不覆盖', async () => {
  const cwd = makeProject()
  const changeDir = writeDesign(cwd, '2026-09-08-knife2b', DESIGN_WITH_LIST)
  await generatePlanModuleImpactFirstVersion(changeDir, cwd)
  const before = readFileSync(join(changeDir, 'module-impact.md'), 'utf8')

  const r = await generatePlanModuleImpactFirstVersion(changeDir, cwd)

  assert.equal(r.status, 'skipped')
  assert.equal(r.reason, 'exists')
  assert.equal(readFileSync(join(changeDir, 'module-impact.md'), 'utf8'), before, '内容不变')
})

test('scale=small → skipped，不落盘', async () => {
  const cwd = makeProject()
  const changeDir = writeDesign(cwd, '2026-09-08-knife2c', DESIGN_WITH_LIST, 'scale: small')

  const r = await generatePlanModuleImpactFirstVersion(changeDir, cwd)

  assert.equal(r.status, 'skipped')
  assert.equal(r.reason, 'scale-small')
  assert.ok(!existsSync(join(changeDir, 'module-impact.md')))
})

test('无 design.md → skipped no-design', async () => {
  const cwd = makeProject()
  const changeDir = join(cwd, '.sillyspec', 'changes', 'nope')
  mkdirSync(changeDir, { recursive: true })

  const r = await generatePlanModuleImpactFirstVersion(changeDir, cwd)

  assert.equal(r.status, 'skipped')
  assert.equal(r.reason, 'no-design')
})

test('design 无清单章节 → skipped no-declared-files', async () => {
  const cwd = makeProject()
  const changeDir = writeDesign(cwd, '2026-09-08-knife2d', '## 方案\n\n只有散文，无清单。\n')

  const r = await generatePlanModuleImpactFirstVersion(changeDir, cwd)

  assert.equal(r.status, 'skipped')
  assert.equal(r.reason, 'no-declared-files')
})

test('无 module-map → skipped no-module-map（缺失仍由 1e 契约校验兜底）', async () => {
  const cwd = makeProject({ withMap: false })
  const changeDir = writeDesign(cwd, '2026-09-08-knife2e', DESIGN_WITH_LIST)

  const r = await generatePlanModuleImpactFirstVersion(changeDir, cwd)

  assert.equal(r.status, 'skipped')
  assert.equal(r.reason, 'no-module-map')
  assert.ok(!existsSync(join(changeDir, 'module-impact.md')))
})
