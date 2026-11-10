/**
 * map CLI 端到端测试（task-03 / FR-05）：临时 git 仓全链——
 * spawn 真实 CLI（node src/index.js）跑 build → 手写 MAP-INDEX+链路 md →
 * git commit 造演进 → map diff → 读回 INDEX 断言派生块与区间外不变。
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const CLI = join(HERE, '..', 'src', 'index.js')

function assert(cond, msg) {
  if (!cond) {
    console.error(`  ✗ ${msg}`)
    process.exitCode = 1
    failed++
  } else {
    console.log(`  ✓ ${msg}`)
    passed++
  }
}
let passed = 0
let failed = 0

function run(args, opts = {}) {
  try {
    const stdout = execFileSync('node', [CLI, ...args], { encoding: 'utf8', timeout: 120_000, ...opts })
    return { rc: 0, stdout }
  } catch (err) {
    return { rc: err.status ?? 1, stdout: err.stdout || '', stderr: err.stderr || '' }
  }
}

const root = mkdtempSync(join(tmpdir(), 'map-e2e-'))
const git = (...a) => execFileSync('git', a, { cwd: root, encoding: 'utf8', timeout: 30_000 })

git('init', '-b', 'main')
git('config', 'user.email', 't@t')
git('config', 'user.name', 't')

// 基线提交：源码 + spec 树（含链路 md 指向 service.py）
mkdirSync(join(root, 'backend'), { recursive: true })
writeFileSync(join(root, 'backend', 'router.py'), 'from fastapi import APIRouter\nrouter = APIRouter()\n\n@router.get("/api/things")\ndef list_things():\n    return []\n')
const mapDir = join(root, '.sillyspec', 'docs', 'proj', 'map')
mkdirSync(mapDir, { recursive: true })
const indexText = [
  'schema_version: 1',
  'domains:',
  '  - id: d',
  '    name: 域',
  '# 人工注释：e2e 区间外锚',
  'routes:',
  '  - route_id: r1',
  '    domain: d',
  '    title: 链路一',
  '    doc: r1.md',
].join('\n') + '\n'
writeFileSync(join(mapDir, 'MAP-INDEX.yaml'), indexText)
writeFileSync(
  join(mapDir, 'r1.md'),
  ['---', 'route_id: r1', 'domain: d', 'title: 链路一', 'schema_version: 1', 'source_commit: BASE', 'covered_files:', '  - backend/service.py', '---', '', '1. **步骤**（后端）', '   文件：`backend/service.py`'].join('\n') + '\n',
)
git('add', '-A')
git('commit', '-m', 'base')
const base = git('rev-parse', '--short', 'HEAD').trim()
// 回填真实 source_commit（链路 md 用 BASE 占位 → 写真值再 commit 一次演进前态）
writeFileSync(
  join(mapDir, 'r1.md'),
  ['---', 'route_id: r1', 'domain: d', 'title: 链路一', 'schema_version: 1', `source_commit: ${base}`, 'covered_files:', '  - backend/service.py', '---', '', '1. **步骤**（后端）', '   文件：`backend/service.py`'].join('\n') + '\n',
)
git('add', '-A')
git('commit', '-m', 'route with real source_commit')

// ── build：真实 CLI 出素材 ────────────────────────────────────────────
const b = run(['map', 'build', '--dir', root])
assert(b.rc === 0, 'CLI map build 退出 0')
let material = null
try { material = JSON.parse(b.stdout) } catch {}
assert(material && material.schema_version === 1, 'build 输出合法素材 JSON')
assert(material && material.routes.some((r) => r.path.includes('/api/things')), 'build 命中 FastAPI 端点')

// ── 演进：改 covered 文件 + 新增无关文件，commit ───────────────────────
writeFileSync(join(root, 'backend', 'service.py'), 'def x():\n    return 2\n')
writeFileSync(join(root, 'unrelated.txt'), 'x')
git('add', '-A')
git('commit', '-m', 'evolve service.py')

// ── diff --dry-run：只打印不写 ───────────────────────────────────────
const beforeText = readFileSync(join(mapDir, 'MAP-INDEX.yaml'), 'utf8')
const d1 = run(['map', 'diff', '--dir', root, '--dry-run'])
assert(d1.rc === 0, 'CLI map diff --dry-run 退出 0')
assert(d1.stdout.includes('r1') && d1.stdout.includes('stale'), 'dry-run 判定表输出 r1 | stale')
assert(readFileSync(join(mapDir, 'MAP-INDEX.yaml'), 'utf8') === beforeText, 'dry-run 零写入')

// ── diff：写回派生块 ─────────────────────────────────────────────────
const d2 = run(['map', 'diff', '--dir', root])
assert(d2.rc === 0, 'CLI map diff 退出 0')
const afterText = readFileSync(join(mapDir, 'MAP-INDEX.yaml'), 'utf8')
assert(afterText.includes('# BEGIN MAP-DIFF'), '派生块 BEGIN 标记写入')
assert(afterText.includes('route_id: r1'), '块内含 r1 条目')
assert(afterText.includes('state: stale'), 'covered 文件被改 → state stale')
assert(afterText.includes('backend/service.py'), 'changed_files 含 service.py')
assert(afterText.includes('checked_at:'), 'checked_at 写入')
assert(afterText.includes('# 人工注释：e2e 区间外锚'), '区间外人工注释保留')
assert(afterText.startsWith(indexText.split('\n')[0]), '区间外前段原样（首行一致）')
// YAML 整体仍可解析且 routes/domains 未破坏
const yaml = await import('js-yaml')
const parsed = yaml.load(afterText)
assert(parsed && parsed.routes && parsed.routes.length === 1 && parsed.domains.length === 1, '写回后 INDEX 整体 YAML 结构完好')
assert(parsed.stale && parsed.stale[0].route_id === 'r1' && parsed.stale[0].state === 'stale', '写回后 stale 块可被 YAML 解析（平台消费口径）')

// ── 幂等重跑：再 diff 一次（无新变更）state 保持 stale（不升回） ────────
const d3 = run(['map', 'diff', '--dir', root])
assert(d3.rc === 0, '幂等重跑退出 0')
const after2 = readFileSync(join(mapDir, 'MAP-INDEX.yaml'), 'utf8')
const parsed2 = yaml.load(after2)
assert(parsed2.stale[0].state === 'stale', '重算无新交集仍 stale（硬规则 2，e2e 级）')

try { rmSync(root, { recursive: true, force: true }) } catch {}

console.log(`\n合计: ${passed} 通过, ${failed} 失败`)
process.exit(failed > 0 ? 1 : 0)
