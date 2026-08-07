/**
 * modules rebuild 默认 dry-run + --force 保护（multi-agent-platform 坑 modules-rebuild-destructive）
 *
 * 背景：sillyspec modules rebuild 直接覆盖 _module-map.yaml，会清空 tags/entrypoints/main_symbols
 * /depends_on/used_by 等手动维护字段（实测 964 行 → 259 行丢内容）。
 * 修复：默认 dry-run 只预览不写 + 打印 --force 提示；--force 才真正覆盖。
 */
import { rebuildModuleMap } from '../src/modules.js'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

let failed = 0
const failures = []
function assertTrue(cond, msg) {
  if (cond) console.log(`  ✅ PASS: ${msg}`)
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}

console.log('=== modules rebuild 默认 dry-run + --force（破坏性保护）===\n')

function makeFixture() {
  const tmp = mkdtempSync(join(tmpdir(), 'rebuild-dryrun-'))
  const modulesDir = join(tmp, '.sillyspec', 'docs', 'testproj', 'modules')
  mkdirSync(modulesDir, { recursive: true })
  const mapPath = join(modulesDir, '_module-map.yaml')
  const oldMap = 'schema_version: 2\nmodules:\n  core:\n    entrypoints: [a.ts]\n    tags: [x]\n'
  writeFileSync(mapPath, oldMap)
  writeFileSync(join(modulesDir, 'core.md'), '---\nmodule_id: core\n---\n\n## 定位\n核心模块\n')
  return { tmp, mapPath, oldMap }
}

{
  // 无 --force：默认 dry-run，不写文件 + 返回 dryRun:true
  const { tmp, mapPath, oldMap } = makeFixture()
  const r = await rebuildModuleMap(tmp, {})
  assertTrue(r.dryRun === true, '无 --force 返回 dryRun:true')
  assertTrue(readFileSync(mapPath, 'utf8') === oldMap, 'dry-run 不覆盖 _module-map.yaml（内容未变）')
  assertTrue(r.path === mapPath, '返回 mapPath 供提示定位')
}

{
  // --force：真正覆盖，返回 dryRun:false，手动字段被清空（骨架重建语义）
  const { tmp, mapPath } = makeFixture()
  const r = await rebuildModuleMap(tmp, { force: true })
  assertTrue(r.dryRun === false, '--force 返回 dryRun:false')
  assertTrue(r.modules === 1, '--force 重建后模块数量正确')
  const after = readFileSync(mapPath, 'utf8')
  assertTrue(after.includes('schema_version: 2'), 'force 后写入新骨架（schema_version: 2）')
  assertTrue(!after.includes('entrypoints: [a.ts]'), '手动字段 entrypoints 被清空（预期语义：rebuild 只重建骨架）')
}

console.log(`\n${'='.repeat(50)}`)
const total = 6
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
if (failures.length > 0) { console.log('失败项:'); failures.forEach(f => console.log(`  - ${f}`)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
