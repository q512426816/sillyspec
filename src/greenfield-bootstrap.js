/**
 * greenfield-bootstrap.js — 绿地仓模块图草案起草（2026-09-25-greenfield-bootstrap）
 *
 * R17 实证：无模块图的新仓，FR 域路由全落伪域/unmapped（臂2 auto-claude、臂3 unmapped），
 * 知识复利从第一条断流。本模块在 flow start 检测到模块图缺席且 --input 有路径语料时，
 * 机器起草初始 _module-map.yaml：
 *   - 模块 id = 路径目录段里首个非泛化段（cli/server/api…），paths = 该文件所在目录（/ 结尾）
 *   - generator: flow-bootstrap-draft + status: draft 自明身份——与 scan 产的正式图区分；
 *     模块图契约本就是机器（scan）产物，「手动维护」指 paths 后续增量，缺席首建不冲突
 *     （方案评审裁定三条件：草案头带警告 + draft 标识 + 不含 blast 段——判级对缺席安全降级 S1）
 *   - 不覆盖已有文件；全库任一 _module-map.yaml 在场（多项目仓）即不写（幂等）
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { writeAtomicSync } from './fs-atomic.js'

const GENERIC_SEGMENTS = new Set(['src', 'lib', 'test', 'tests', 'spec', 'docs', 'doc', 'app', 'packages', 'scripts', 'config', 'public', 'internal', 'node_modules'])

/** 路径组 → { moduleId → Set<dirPath> }（目录以 / 结尾；根文件无模块归属丢弃）。 */
function groupByModule(paths) {
  const mods = new Map()
  for (const raw of paths) {
    const p = String(raw || '').replace(/\\/g, '/')
    const segs = p.split('/').filter(Boolean)
    if (segs.length < 2) continue // 根文件：无目录段
    const dirSegs = segs.slice(0, -1)
    const rawMod = dirSegs.find((s) => !GENERIC_SEGMENTS.has(s.toLowerCase()))
    if (!rawMod) continue // 全泛化段（src/x.js）：无可命名模块——留给 unmapped 兜底
    // id 消毒（评审 P2 清偿）：FR 域正则 [a-z0-9-]——大写/点/下划线段会铸出不可回读域；
    // 消毒后空（纯符号段如 .github → github，纯点段丢弃）则该路径不建模块
    const modId = rawMod.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^[-.]+|[-.]+$/g, '')
    if (!modId || /^-+$/.test(modId)) continue
    const dir = dirSegs.join('/') + '/'
    if (!mods.has(modId)) mods.set(modId, new Set())
    mods.get(modId).add(dir)
  }
  return mods
}

/** 项目目录名：package.json name 优先（sanitize 成文件名安全段），fallback 'app'。 */
function projectName(cwd) {
  try {
    const pkg = JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8'))
    const n = String(pkg && pkg.name || '').split('/').pop().replace(/[^\w.-]/g, '-').replace(/^[-.]+|[-.]+$/g, '')
    if (n) return n
  } catch { /* 非 node 项目或缺件 */ }
  return 'app'
}

/**
 * 起草初始 _module-map.yaml。
 * @param {{ cwd: string, specBase: string, paths: string[] }} opts
 * @returns {{ written: boolean, path?: string, modules: number, moduleIds: string[], reason?: string }}
 */
export function draftModuleMap({ cwd, specBase, paths }) {
  const docsDir = join(specBase, 'docs')
  // 幂等闸门：任一项目已有模块图（含草案）即不写——多项目仓防重复建
  try {
    if (existsSync(docsDir)) {
      for (const e of readdirSync(docsDir, { withFileTypes: true })) {
        if (e.isDirectory() && existsSync(join(docsDir, e.name, 'modules', '_module-map.yaml'))) {
          return { written: false, modules: 0, moduleIds: [], reason: `已有模块图（${e.name}）` }
        }
      }
    }
  } catch { /* 扫描异常按缺席处理 */ }
  const mods = groupByModule(paths)
  if (mods.size === 0) return { written: false, modules: 0, moduleIds: [], reason: '路径语料无可命名模块（全泛化段/根文件）' }
  const proj = projectName(cwd)
  const mapDir = join(docsDir, proj, 'modules')
  mkdirSync(mapDir, { recursive: true })
  const mapPath = join(mapDir, '_module-map.yaml')
  if (existsSync(mapPath)) return { written: false, modules: 0, moduleIds: [], reason: '目标文件已存在（不覆盖）' }
  const lines = [
    'schema_version: 2',
    'generated_at: ' + new Date().toISOString(),
    'generator: flow-bootstrap-draft',
    'status: draft',
    '',
    '# ⚠️ 绿地草案——flow start 按 --input 路径语料机器聚合，未经 scan 校准。',
    '# 校准路径：sillyspec run scan（或 modules 重建）后转正；转正前域路由按本草案分流（不再落 unmapped）。',
    '# ⚠️ 勿跑 modules rebuild --force——会清空手动维护的 paths（与正式图同警告）。',
    '',
    'modules:',
  ]
  const ids = [...mods.keys()].sort()
  for (const id of ids) {
    lines.push(`  ${id}:`)
    lines.push('    status: draft')
    lines.push('    paths:')
    for (const p of [...mods.get(id)].sort()) lines.push(`      - ${p}`)
    lines.push('')
  }
  writeAtomicSync(mapPath, lines.join('\n'))
  return { written: true, path: mapPath.replace(/\\/g, '/'), modules: ids.length, moduleIds: ids }
}

export default { draftModuleMap }
