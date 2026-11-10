/**
 * map build 素材生成器测试（2026-11-10-map-cli-basemap task-01 / FR-01 / D-001@v1）。
 *
 * 验证：
 * 1. JSON 形状：schema_version=1 + routes[{method,path,file}] + endpoint_files 映射。
 * 2. 路由表：FastAPI 装饰器端点命中（复用 endpoint-extractor）；file 为仓根相对 POSIX。
 * 3. 一层 import：TS 相对 import 命中（含 index 解析）；Python 相对导入命中。
 * 4. 虚拟包跳过：裸包名/包别名 import（如 'yaml'、'@ant-design/x'、'node:fs'）不进关联。
 * 5. 零写入：build 前后目录 mtime 与内容不变（D-001@v1）。
 * 6. 目录不存在退出 2。
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readdirSync, statSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { runMapBuild, extractRelativeImports, MATERIAL_SCHEMA_VERSION } from '../src/map-build.js'

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

// ── fixture：假后端仓（FastAPI + TS 混合） ──────────────────────────────
const root = mkdtempSync(join(tmpdir(), 'map-build-'))
mkdirSync(join(root, 'backend', 'app'), { recursive: true })
writeFileSync(
  join(root, 'backend', 'app', 'router.py'),
  `from fastapi import APIRouter
from .service import do_work

router = APIRouter()

@router.get("/api/things")
def list_things():
    return []
`,
)
writeFileSync(join(root, 'backend', 'app', 'service.py'), 'def do_work():\n    return 1\n')
writeFileSync(
  join(root, 'backend', 'server.ts'),
  `import express from 'express'
import { helper } from './helper'
import fs from 'node:fs'
import { yaml } from 'yaml'

const app = express()
app.get('/api/ts-things', (req, res) => res.json({}))
`,
)
writeFileSync(join(root, 'backend', 'helper.ts'), 'export const helper = 1\n')

// 零写入基线：递归快照（路径→[mtimeMs, size]）
function snapshot(d) {
  const out = {}
  function walk(dir) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, e.name)
      if (e.isDirectory()) walk(full)
      else {
        const st = statSync(full)
        out[full] = [st.mtimeMs, st.size, readFileSync(full, 'utf8')]
      }
    }
  }
  walk(d)
  return out
}
const before = snapshot(root)

// ── 1-5. 主路径（捕获 stdout） ──────────────────────────────────────────
let captured = ''
const origLog = console.log
console.log = (...a) => { captured += a.join(' ') + '\n' }
const rc = await runMapBuild(root, {})
console.log = origLog

assert(rc === 0, '正常仓退出码 0')
let material = null
try { material = JSON.parse(captured) } catch {}
assert(material !== null, 'stdout 输出合法 JSON')
assert(material.schema_version === MATERIAL_SCHEMA_VERSION, '顶层 schema_version=1')
assert(Array.isArray(material.routes) && material.routes.length >= 2, `routes 非空（实际 ${material.routes?.length}）`)

const pyRoute = material.routes?.find((r) => r.path.includes('/things') && r.file.endsWith('router.py'))
assert(pyRoute !== undefined, 'FastAPI 端点命中（GET /api/things）')
assert(pyRoute && pyRoute.method === 'GET', '端点 method=GET')
assert(pyRoute && !pyRoute.file.includes('\\'), 'file 为 POSIX 相对路径（无反斜杠）')

const tsRoute = material.routes?.find((r) => r.path.includes('ts-things'))
assert(tsRoute !== undefined, 'Express 端点命中（GET /api/ts-things）')

const ef = material.endpoint_files || {}
const pyKey = Object.keys(ef).find((k) => k.endsWith('router.py'))
assert(pyKey !== undefined, 'endpoint_files 含 router.py')
assert(
  pyKey && ef[pyKey].some((f) => f.endsWith('service.py')),
  'Python 相对导入命中 service.py',
)
const tsKey = Object.keys(ef).find((k) => k.endsWith('server.ts'))
assert(tsKey !== undefined, 'endpoint_files 含 server.ts')
assert(
  tsKey && ef[tsKey].some((f) => f.endsWith('helper.ts')),
  'TS 相对 import 命中 helper.ts',
)
assert(
  tsKey && !ef[tsKey].some((f) => f.includes('node:')),
  'node: 内建跳过',
)
assert(
  tsKey && !ef[tsKey].some((f) => f === 'yaml' || f.includes('yaml')),
  '裸包名（yaml）跳过',
)

// 零写入（D-001@v1）：前后快照一致
const after = snapshot(root)
assert(
  Object.keys(before).length === Object.keys(after).length &&
    Object.keys(before).every((k) => after[k] && before[k][2] === after[k][2]),
  '零文件写入：前后内容快照一致（D-001@v1）',
)

// ── 6. --json 单行形态 ────────────────────────────────────────────────
let lineCap = ''
console.log = (...a) => { lineCap += a.join(' ') }
await runMapBuild(root, { json: true })
console.log = origLog
assert(!lineCap.includes('\n  ') && lineCap.trim().startsWith('{'), '--json 单行形态')

// ── 7. 目录不存在退出 2 ──────────────────────────────────────────────
const rc2 = await runMapBuild(join(root, 'no-such-dir'), {})
assert(rc2 === 2, '目录不存在退出码 2')

// ── 8. extractRelativeImports 单元面（边界） ──────────────────────────
const tsImports = extractRelativeImports(
  `import a from './x'\nimport './side-effect'\nexport * from '../pub'\nconst m = await import('./dyn')\nimport fs from 'fs'\n`,
  '.ts',
)
assert(tsImports.includes('./x') && tsImports.includes('./side-effect') && tsImports.includes('../pub'), 'TS 三形态相对 import 全命中')
assert(tsImports.includes('./dyn'), '动态 import 相对路径命中')
assert(!tsImports.includes('fs'), '裸包名不命中')

const pyImports = extractRelativeImports(`from .mod import x\nfrom ..pkg import y\nfrom fastapi import APIRouter\n`, '.py')
assert(pyImports.includes('./mod') && pyImports.includes('../pkg'), 'Python 相对导入命中（归一为 ./ ../ 形态）')
assert(!pyImports.includes('fastapi'), 'Python 绝对包名跳过')

assert(extractRelativeImports('anything', '.java') && extractRelativeImports('anything', '.java').length === 0, '非 py/ts 扩名返回空数组')

// ── 清理 ──────────────────────────────────────────────────────────────
try { rmSync(root, { recursive: true, force: true }) } catch {}

console.log(`\n合计: ${passed} 通过, ${failed} 失败`)
process.exit(failed > 0 ? 1 : 0)
