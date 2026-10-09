/**
 * 刀批 2（ql-20260909-006）：design 自检步删除 + sidecar 同步命令化 + 预检前移。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { execSync, execFileSync } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { syncModuleDocSidecars } from '../src/module-impact.js'
import { definition as brainstormDef } from '../src/stages/brainstorm.js'

const bin = join(dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'sillyspec.js')

test('brainstorm Step6：agent 侧格式自检复刻已删（CLI 门禁承担声明在场）', () => {
  const step6 = brainstormDef.steps.find(s => (s.name || '').includes('设计文档'))
  const p = step6.prompt
  assert.ok(p.includes('格式自检不做 agent 侧复刻'), '删除声明在场')
  assert.ok(!p.includes('只查章节齐全'), '旧自检操作清单退场')
})

function mkSyncFx() {
  const cwd = mkdtempSync(join(tmpdir(), 'sillyspec-mds-'))
  execSync('git init -q', { cwd })
  execSync('git config user.email t@t && git config user.name t', { cwd })
  const mapDir = join(cwd, '.sillyspec', 'docs', 'proj', 'modules')
  mkdirSync(join(cwd, 'src', 'core'), { recursive: true })
  mkdirSync(mapDir, { recursive: true })
  writeFileSync(join(mapDir, '_module-map.yaml'), 'schema_version: 2\nmodules:\n  core:\n    paths:\n      - src/core/\n')
  writeFileSync(join(mapDir, 'core.md'), '---\nschema_version: 1\nmodule_id: core\nupdated_at: 2020-01-01T00:00:00+08:00\n---\n\n# core\n')
  writeFileSync(join(cwd, 'src', 'core', 'a.js'), 'x\n')
  execSync('git add -A && git commit -qm base', { cwd })
  writeFileSync(join(cwd, 'src', 'core', 'a.js'), 'y\n')
  return { cwd, mapDir }
}

test('syncModuleDocSidecars：sidecar 追加 + 卡戳 + 幂等二跑跳过', () => {
  const fx = mkSyncFx()
  try {
    const before = Date.now()
    const r1 = syncModuleDocSidecars({ cwd: fx.cwd, changeName: '2026-09-09-t1', note: '测试变更' })
    const after = Date.now()
    assert.deepEqual(r1.synced, ['proj/core'])  // 2026-09-21 multimap 修复后 synced 带项目前缀（多项目仓模块身份含项目）
    const sc = readFileSync(join(fx.mapDir, 'core.changelog.md'), 'utf8')
    assert.ok(sc.includes('- 2026-09-09-t1 | 测试变更'), '追加行在场')
    const card = readFileSync(join(fx.mapDir, 'core.md'), 'utf8')
    assert.ok(!card.includes('2020-01-01'), 'updated_at 已戳')
    // 戳为全量 ISO 且瞬间正确（2026-10-09-module-card-updated-at-iso）：Date.parse 落
    // 同步前后窗内——旧实现（UTC 数字拼 '+08:00'）解析瞬间恒早真实时刻 8h，必出窗。
    const m = /^updated_at: (\S+)$/m.exec(card)
    assert.ok(m, 'updated_at 行在场')
    assert.ok(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(m[1]), `全量 ISO 形状（实得 ${m[1]}）`)
    const ts = Date.parse(m[1])
    assert.ok(Number.isFinite(ts) && ts >= before - 1000 && ts <= after + 1000,
      `解析瞬间落窗 [${before - 1000}, ${after + 1000}]（实得 ${ts}，旧实现恒偏 -8h）`)
    // 幂等
    const r2 = syncModuleDocSidecars({ cwd: fx.cwd, changeName: '2026-09-09-t1', note: '测试变更' })
    assert.deepEqual(r2.skipped, ['proj/core'], '二跑跳过')
    const sc2 = readFileSync(join(fx.mapDir, 'core.changelog.md'), 'utf8')
    assert.equal((sc2.match(/2026-09-09-t1/g) || []).length, 1, '无重复行')
  } finally { rmSync(fx.cwd, { recursive: true, force: true }) }
})

test('CLI module-docs-sync：命令式冒烟（--json）', () => {
  const fx = mkSyncFx()
  try {
    const out = execFileSync(process.execPath, [bin, 'module-docs-sync', '--change', '2026-09-09-t2', '--note', 'CLI 冒烟', '--json'], { cwd: fx.cwd, encoding: 'utf8' })
    const j = JSON.parse(out)
    assert.deepEqual(j.synced, ['proj/core'])
    assert.ok(readFileSync(join(fx.mapDir, 'core.changelog.md'), 'utf8').includes('- 2026-09-09-t2 | CLI 冒烟'))
  } finally { rmSync(fx.cwd, { recursive: true, force: true }) }
})
