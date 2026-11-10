/**
 * map build — 项目地图素材生成器（MASTER 2026-11-08-project-map 子变更 2 / D-001@v1）。
 *
 * 静态分析产出链路素材 JSON 到 stdout（路由表 + 端点文件→一层 import 关联），
 * 供子变更 3 的 agent 会话生成链路文档时消费。**零文件写入**（D-001@v1 用户拍板：
 * 契约只定义 domains/routes（agent 产出）与 MAP-DIFF 派生块（map diff 写），
 * build 不落任何新文件类型）。
 *
 * 命令形态：sillyspec map build [--dir <项目根>] [--json]
 * - 缺省 pretty 输出（缩进 2）；--json 单行机读。
 * - 退出码：0 成功；2 目录不存在；1 内部错误。
 */

import { existsSync, readFileSync } from 'node:fs'
import { extname, join, relative, sep } from 'node:path'
import { scanBackendEndpoints } from './endpoint-extractor.js'

/** 素材 JSON 自身版本（D-001@v1 故障面对策：演进走版本字段，消费方按版本分支）。 */
export const MATERIAL_SCHEMA_VERSION = 1

/**
 * 从源码文本提取一层 import 的仓内相对路径（Python from-import / TS relative import）。
 * 只收以 ./ 或 ../ 开头的相对说明符（虚拟包名与裸包名跳过——它们不是仓内文件证据）。
 * @param {string} content 源码文本
 * @param {string} ext '.py' | '.js' | '.ts' | 其他（其他直接空）
 * @returns {string[]} 相对说明符列表（原始形态，去重保序）
 */
export function extractRelativeImports(content, ext) {
  const out = []
  const seen = new Set()
  const push = (spec) => {
    if (!spec || seen.has(spec)) return
    seen.add(spec)
    out.push(spec)
  }
  if (ext === '.py') {
    // from .mod import x / from ..pkg.mod import y（相对导入）；from app.x import（绝对包名跳过）
    // spec 归一为 ../ 相对形态：'.mod'→'./mod'、'..pkg.mod'→'../pkg.mod'（剥 __init__ 风格包段由 resolve 补扩展名兜住）
    const re = /^\s*from\s+(\.+[\w.]*)\s+import\s/gm
    let m
    while ((m = re.exec(content)) !== null) {
      const dots = m[1].match(/^\./)[0].length ? m[1].length - m[1].replace(/^\.+/, '').length : 0
      const rest = m[1].replace(/^\.+/, '')
      push(dots === 1 ? './' + rest : '../'.repeat(dots - 1) + rest)
    }
    return out
  }
  if (ext === '.js' || ext === '.ts') {
    // import x from './mod' / import './side' / export * from '../mod'（含动态 import('./x')）
    const re = /(?:^|[^\w$.])import\s+(?:[\w*{},\s]+?\s+from\s+)?['"](\.[^'"]+)['"]/g
    let m
    while ((m = re.exec(content)) !== null) push(m[1])
    const reDyn = /(?:^|[^\w$.])import\s*\(\s*['"](\.[^'"]+)['"]\s*\)/g
    while ((m = reDyn.exec(content)) !== null) push(m[1])
    const reExport = /(?:^|[^\w$.])export\s+(?:\*|(?:[\w{},\s]+?))\s+from\s+['"](\.[^'"]+)['"]/g
    while ((m = reExport.exec(content)) !== null) push(m[1])
    return out
  }
  return out
}

/** 相对说明符 → 仓内候选文件路径（补扩展名解析；存在才收，相对 dir 且 POSIX 化）。 */
function resolveImportCandidates(dir, endpointFile, specs) {
  const baseDir = join(dir, endpointFile, '..')
  const exts = ['.ts', '.js', '.py', '/index.ts', '/index.js']
  const out = []
  for (const spec of specs) {
    for (const ext of exts) {
      const abs = join(baseDir, spec + ext)
      if (existsSync(abs) && !abs.startsWith('..')) {
        out.push(relative(dir, abs).split(sep).join('/'))
        break
      }
    }
  }
  return out
}

/**
 * 素材生成主入口。
 * @param {string} dir 项目根（绝对或相对 cwd）
 * @param {{ json?: boolean }} opts
 * @returns {number} 退出码（0/2/1）
 */
export async function runMapBuild(dir, opts = {}) {
  if (!dir || typeof dir !== 'string') {
    console.error('map build：缺少项目根目录（--dir）')
    return 2
  }
  if (!existsSync(dir)) {
    console.error(`map build：目录不存在：${dir}`)
    return 2
  }

  try {
    // 1. 路由表（endpoint-extractor 既有能力，FastAPI/Express/Spring + 排除目录）
    const endpoints = scanBackendEndpoints(dir)
    const routes = endpoints.map((e) => ({
      method: e.method,
      path: e.path,
      // source 是绝对路径 → 仓根相对 POSIX（平台/agent 消费口径，scan-facts :523 同款映射）
      file: relative(dir, e.source).split(sep).join('/'),
    }))

    // 2. 端点文件 → 一层仓内 import 关联（covered_files 候选素材）
    const endpointFilesSet = new Map() // relFile -> Set<importedRel>
    for (const r of routes) {
      if (!endpointFilesSet.has(r.file)) endpointFilesSet.set(r.file, new Set())
    }
    for (const [relFile, imports] of endpointFilesSet) {
      try {
        const abs = join(dir, relFile)
        const content = readFileSync(abs, 'utf8')
        const specs = extractRelativeImports(content, extname(abs).toLowerCase())
        for (const resolved of resolveImportCandidates(dir, relFile, specs)) {
          imports.add(resolved)
        }
      } catch {
        // 读失败（二进制/权限）静默跳过——素材尽力而为
      }
    }
    const endpoint_files = {}
    for (const [relFile, imports] of endpointFilesSet) {
      endpoint_files[relFile] = [...imports].sort()
    }

    // 3. 输出（零写入：仅 stdout）
    const material = {
      schema_version: MATERIAL_SCHEMA_VERSION,
      routes,
      endpoint_files,
    }
    console.log(opts.json ? JSON.stringify(material) : JSON.stringify(material, null, 2))
    return 0
  } catch (err) {
    console.error(`map build：内部错误：${err && err.message ? err.message : err}`)
    return 1
  }
}
