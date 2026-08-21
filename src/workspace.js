/**
 * workspace.js — `sillyspec workspace add/remove/status` 的多项目工作区管理
 * （2026-08-21 agent-手工产出审计第四批 C-1）。
 *
 * workspace skill 此前纯手写：`.sillyspec/projects/<name>.yaml` 5 字段 YAML 手编、remove 手删
 * 文件手 commit、status 用 bash for-loop + grep/sed 解析 YAML 逐项目 cd 探测——skill 明言
 * 「CLI 没有 workspace 命令」。本模块命令化全部机械面：
 *   - add：YAML 外科写入（name/path/status 必填 + role/repo 可选追加，已有字段保留）、路径校验
 *   - remove：删 yaml（--commit 时顺带 git add 该删除）
 *   - status：逐项目探测（yaml 解析 + .sillyspec 产物存在性），输出 skill 原格式的三态表
 * init 语义对齐（skill L75）：init 只写 name/path/status 三字段，role/repo 是 add 专属追加。
 */
import { existsSync, readFileSync, writeFileSync, unlinkSync, readdirSync, mkdirSync } from 'fs'
import { join, basename, resolve } from 'path'
import { resolveSpecDir } from './run/shared.js'

function parseSimpleYaml(text) {
  const out = {}
  for (const line of String(text || '').split('\n')) {
    const m = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/)
    if (m) out[m[1]] = m[2].trim()
  }
  return out
}

function readProjectYaml(specBase, name) {
  const p = join(specBase, 'projects', `${name}.yaml`)
  if (!existsSync(p)) return null
  return parseSimpleYaml(readFileSync(p, 'utf8'))
}

/**
 * 新增/更新子项目登记。
 * @param {{ cwd: string, name: string, path: string, role?: string|null, repo?: string|null, specDir?: string|null }} opts
 * @returns {{ file: string, created: boolean, fieldsKept: string[] }}
 * @throws {Error} name 非法 / path 不存在
 */
export function workspaceAdd({ cwd, name, path: projPath, role = null, repo = null, specDir = null }) {
  if (!name || !/^[A-Za-z0-9_.\-]+$/.test(name)) {
    throw new Error(`子项目名非法: "${name}"（限字母数字 . _ -，作 yaml 文件名）`)
  }
  const specBase = resolveSpecDir(cwd, { specDir })
  const abs = resolve(cwd, projPath)
  if (!existsSync(abs)) {
    throw new Error(`路径不存在: ${abs}`)
  }
  const yamlPath = join(specBase, 'projects', `${name}.yaml`)
  const existed = existsSync(yamlPath)
  const prev = existed ? parseSimpleYaml(readFileSync(yamlPath, 'utf8')) : {}
  // init 三字段 + add 追加字段；已有值优先保留（幂等重跑不覆盖手调内容）
  const fields = {
    name,
    path: projPath.replace(/\\/g, '/'),
    status: prev.status || 'active',
  }
  if (role) fields.role = role
  else if (prev.role) fields.role = prev.role
  if (repo) fields.repo = repo
  else if (prev.repo) fields.repo = prev.repo
  const fieldsKept = Object.keys(prev).filter(k => fields[k] === prev[k] && k !== 'name' && k !== 'path')
  mkdirSync(join(specBase, 'projects'), { recursive: true })
  // 追加不认识的手写字段（防整文件重序列化丢内容）
  for (const k of Object.keys(prev)) {
    if (!(k in fields)) fields[k] = prev[k]
  }
  const text = Object.entries(fields).map(([k, v]) => `${k}: ${v}`).join('\n') + '\n'
  writeFileSync(yamlPath, text)
  return { file: yamlPath, created: !existed, fieldsKept }
}

/**
 * 移除子项目登记（删 yaml；git add 由调用方/CLI 层做）。
 * @returns {{ file: string }} @throws {Error} 不存在
 */
export function workspaceRemove({ cwd, name, specDir = null }) {
  const specBase = resolveSpecDir(cwd, { specDir })
  const yamlPath = join(specBase, 'projects', `${name}.yaml`)
  if (!existsSync(yamlPath)) throw new Error(`子项目不存在: ${yamlPath}`)
  unlinkSync(yamlPath)
  return { file: yamlPath }
}

/**
 * 工作区状态探测（skill 3d 的命令化）：逐项目 yaml 解析 + 三态探测。
 * @returns {{ projects: Array<{name, path, role, state, detail}>, sharedDocs: string[] }}
 *   state ∈ initialized（有 .sillyspec）/ scanned（docs/<name>/scan 有文档）/ unregistered（无 .sillyspec）
 */
export function workspaceStatus({ cwd, specDir = null }) {
  const specBase = resolveSpecDir(cwd, { specDir })
  const projects = []
  const projDir = join(specBase, 'projects')
  if (existsSync(projDir)) {
    for (const f of readdirSync(projDir).filter(f => f.endsWith('.yaml')).sort()) {
      const y = parseSimpleYaml(readFileSync(join(projDir, f), 'utf8'))
      const name = y.name || basename(f, '.yaml')
      const projAbs = resolve(cwd, y.path || '.')
      let state
      let detail
      if (!existsSync(projAbs)) {
        state = 'missing'
        detail = '路径不存在（yaml 的 path 失效）'
      } else if (!existsSync(join(projAbs, '.sillyspec'))) {
        state = 'unregistered'
        detail = '未初始化（无 .sillyspec）'
      } else {
        const scanDir = join(projAbs, '.sillyspec', 'docs', name, 'scan')
        let scanCount = 0
        try { scanCount = readdirSync(scanDir).filter(x => x.endsWith('.md')).length } catch {}
        if (scanCount > 0) {
          state = 'scanned'
          detail = `已扫描（${scanCount} 份文档）`
        } else {
          state = 'initialized'
          detail = '已初始化（未扫描）'
        }
      }
      projects.push({ name, path: y.path || '?', role: y.role || '', state, detail })
    }
  }
  let sharedDocs = []
  try {
    sharedDocs = readdirSync(join(specBase, 'shared')).filter(f => f.endsWith('.md')).sort()
  } catch {}
  return { projects, sharedDocs }
}
