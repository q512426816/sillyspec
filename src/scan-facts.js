/**
 * scan-facts.js — scan 事实底稿（archify 借鉴：机械事实预咀嚼，2026-09-05）
 *
 * 定位：把 scan 子代理「各自从零 grep 探索」的机械部分（端点清单 / 依赖与脚本清单 /
 * 源码规模 / git 基线）收敛为 CLI 一次确定性抽取的共享底稿——agent 从「发现」降级为
 * 「解读」，探索 token 不再按子代理数量重复计费（为什么 archify 快的机制 2/7，分析见
 * docs/sillyspec/archify-reference-analysis-2026-09-04.md）。
 *
 * 产物：docs/<project>/scan/_facts.md（下划线前缀 = 非必需文档，workflow check 与
 * postcheck 的 7 份清单不查它）。底稿里的 file:line 引用天然进入 scan_doc_ref_invalid
 * 核验与 scan-diff staleRefs 漂移追踪——这份底稿即 scan IR 的「机器半边」；
 * agent 半边（per-doc claims sidecar）走正式 change 另行落地。
 *
 * 约束：fail-soft——任何一段抽取失败只跳过该段（md 里附注记），绝不抛出、绝不阻断 scan。
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { scanBackendEndpoints, scanFrontendApiCalls } from './endpoint-extractor.js'
import { estimateSourceSize } from './run/scan-profile.js'
import { safeGit } from './git-helper.js'

/** 底稿各清单的上限（防大仓把底稿撑爆反而变成新的 token 黑洞） */
const MAX_ENDPOINTS = 60
const MAX_FRONTEND_CALLS = 30
const MAX_DEPS = 40
const MAX_SCRIPTS = 20

/** 依赖与脚本清单：package.json 优先（结构化最稳），pyproject.toml 做行级 best-effort，其余清单记存在性 */
function readManifestFacts(root) {
  const manifests = []
  for (const f of ['package.json', 'pyproject.toml', 'pom.xml', 'go.mod', 'build.gradle', 'Cargo.toml', 'requirements.txt', 'Gemfile', 'composer.json']) {
    if (existsSync(join(root, f))) manifests.push(f)
  }
  const deps = []
  const scripts = []
  let pkgName = null
  if (existsSync(join(root, 'package.json'))) {
    try {
      const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
      pkgName = pkg.name || null
      for (const key of ['dependencies', 'devDependencies', 'peerDependencies']) {
        for (const dep of Object.keys(pkg[key] || {})) deps.push(dep)
      }
      for (const [name, cmd] of Object.entries(pkg.scripts || {})) scripts.push(`${name} = ${cmd}`)
    } catch { /* 坏 package.json 不阻断，仅缺该段 */ }
  } else if (existsSync(join(root, 'pyproject.toml'))) {
    try {
      const lines = readFileSync(join(root, 'pyproject.toml'), 'utf8').split(/\r?\n/)
      // 两种形态：PEP 621 `dependencies = ["pkg>=x", ...]` 数组；poetry `[tool.poetry.dependencies]` 段
      let inArray = false
      let section = ''
      for (const line of lines) {
        const sec = line.match(/^\[([^\]]+)\]\s*$/)
        if (sec) { section = sec[1]; inArray = false; continue }
        if (/^dependencies\s*=\s*\[/.test(line)) inArray = true
        if (inArray) {
          for (const m of line.matchAll(/["']([A-Za-z0-9_.-]+)\s*[\[<>=!~;]/g)) deps.push(m[1])
          if (/\]\s*$/.test(line) && !/^dependencies/.test(line)) inArray = false
        } else if (section === 'tool.poetry.dependencies') {
          const m = line.match(/^\s*([A-Za-z0-9_.-]+)\s*=\s*["'{]/)
          if (m && m[1] !== 'python') deps.push(m[1])
        }
      }
    } catch { /* best-effort */ }
  }
  return { manifests, pkgName, deps: [...new Set(deps)].slice(0, MAX_DEPS), depsTruncated: new Set(deps).size > MAX_DEPS, scripts: scripts.slice(0, MAX_SCRIPTS) }
}

/** 端点与前端调用抽取（source 转 cwd 相对 POSIX 路径，引用形态可直接被 docs-check/staleRefs 消费） */
function collectEndpointFacts(cwd, root) {
  let backend = []
  let frontend = []
  try { backend = scanBackendEndpoints(root) } catch { /* fail-soft */ }
  try { frontend = scanFrontendApiCalls(root) } catch { /* fail-soft */ }
  const rel = (abs) => relative(cwd, abs).replace(/\\/g, '/')
  return {
    backend: backend.slice(0, MAX_ENDPOINTS).map(e => ({ method: e.method, path: e.path, ref: `${rel(e.source)}:${e.line}` })),
    backendTotal: backend.length,
    frontend: frontend.slice(0, MAX_FRONTEND_CALLS).map(e => ({ method: e.method, path: e.path, ref: `${rel(e.source)}:${e.line}` })),
    frontendTotal: frontend.length,
  }
}

/**
 * 确定性收集 scan 机械事实（纯同步，不写盘）。
 * @param {{ cwd: string, projectPath?: string|null }} opts cwd：仓库根（引用解析锚）；projectPath：子项目相对路径（缺省主项目）
 * @returns {object} facts（renderScanFactsMd 的输入）
 */
export function collectScanFacts({ cwd, projectPath = null }) {
  const root = projectPath ? join(cwd, projectPath) : cwd
  const manifest = readManifestFacts(root)
  const size = (() => { try { return estimateSourceSize(root) } catch { return { fileCount: 0, sourceBytes: 0 } } })()
  const git = safeGit(cwd, ['rev-parse', '--short', 'HEAD'])
  const type = manifest.manifests.includes('package.json') ? 'nodejs'
    : (manifest.manifests.includes('pyproject.toml') || manifest.manifests.includes('requirements.txt')) ? 'python'
    : manifest.manifests.includes('pom.xml') ? 'maven'
    : manifest.manifests.includes('go.mod') ? 'go'
    : manifest.manifests.includes('Cargo.toml') ? 'rust'
    : 'generic'
  return {
    generatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
    projectPath,
    type,
    pkgName: manifest.pkgName,
    gitHead: git && git.value ? git.value.trim() : null,
    manifests: manifest.manifests,
    deps: manifest.deps,
    depsTruncated: manifest.depsTruncated,
    scripts: manifest.scripts,
    size,
    endpoints: collectEndpointFacts(cwd, root),
  }
}

/**
 * 渲染事实底稿 markdown。引用一律 `cwd 相对路径:行号`（反引号），可直接被
 * collectDocRefs / scan_doc_ref_invalid / staleRefs 消费。
 * @param {object} facts collectScanFacts 返回值
 * @returns {string} markdown 全文
 */
export function renderScanFactsMd(facts) {
  const scope = facts.projectPath ? `${facts.projectPath}/` : '（主项目根）'
  const lines = []
  lines.push(`# scan 事实底稿（CLI 确定性抽取）`)
  lines.push('')
  lines.push(`> 生成：sillyspec scan facts · ${facts.generatedAt} · 范围：${scope} · git HEAD：${facts.gitHead || '（不可用）'}`)
  lines.push('> 本文件由 CLI 机器生成（零 AI token）。子代理**禁止重新 grep 发现**下列机械事实，只做解读与成文；与源码冲突时以本底稿为准并标注差异。')
  lines.push('')
  lines.push('## 项目类型与清单')
  lines.push('')
  lines.push(`- 类型判定：${facts.type}${facts.pkgName ? `（包名 ${facts.pkgName}）` : ''}`)
  lines.push(`- 清单文件：${facts.manifests.length > 0 ? facts.manifests.join(' / ') : '（未发现）'}`)
  lines.push(`- 源码规模：${facts.size.fileCount} 个源文件 / ${Math.round(facts.size.sourceBytes / 1024)}KB`)
  lines.push('')
  if (facts.deps.length > 0) {
    lines.push(`## 依赖清单${facts.depsTruncated ? `（前 ${MAX_DEPS} 个，共更多）` : ''}`)
    lines.push('')
    lines.push(facts.deps.join(', '))
    lines.push('')
  }
  if (facts.scripts.length > 0) {
    lines.push('## package.json scripts')
    lines.push('')
    for (const s of facts.scripts) lines.push(`- ${s}`)
    lines.push('')
  }
  lines.push(`## 后端端点（${facts.endpoints.backendTotal} 条${facts.endpoints.backendTotal > MAX_ENDPOINTS ? `，仅列前 ${MAX_ENDPOINTS}` : ''}）`)
  lines.push('')
  if (facts.endpoints.backend.length === 0) lines.push('（未抽取到路由定义——非后端项目或框架不在支持列表）')
  for (const e of facts.endpoints.backend) lines.push(`- \`${e.method} ${e.path}\` — \`${e.ref}\``)
  lines.push('')
  if (facts.endpoints.frontend.length > 0) {
    lines.push(`## 前端 API 调用（${facts.endpoints.frontendTotal} 条${facts.endpoints.frontendTotal > MAX_FRONTEND_CALLS ? `，仅列前 ${MAX_FRONTEND_CALLS}` : ''}）`)
    lines.push('')
    for (const e of facts.endpoints.frontend) lines.push(`- \`${e.method} ${e.path}\` — \`${e.ref}\``)
    lines.push('')
  }
  return lines.join('\n') + '\n'
}

/**
 * 收集并落盘事实底稿（scan 步骤 3 / `sillyspec scan facts` CLI 共用入口）。
 * @param {{ cwd: string, specDir: string, projectName: string, projectPath?: string|null }} opts
 * @returns {{ outPath: string, facts: object }}
 */
export function buildAndWriteScanFacts({ cwd, specDir, projectName, projectPath = null }) {
  const facts = collectScanFacts({ cwd, projectPath })
  const outDir = join(specDir, 'docs', projectName, 'scan')
  mkdirSync(outDir, { recursive: true })
  const outPath = join(outDir, '_facts.md')
  writeFileSync(outPath, renderScanFactsMd(facts), 'utf8')
  return { outPath, facts }
}
