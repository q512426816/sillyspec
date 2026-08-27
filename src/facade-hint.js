/**
 * facade-hint.js — plan 门「透传必经文件」候选探测（advisory）。
 *
 * 坑 plan-facade-files-manual-backfill（2026-08-28 用户实证 ×2）：facade 文件（如
 * daemon/service.py——新端点/新模块必须在它里面挂载/转发才对外生效）不进 design §6 /
 * TaskCard allowed_paths，执行期子代理按现实改它 → apply Gate1 拦截 → 人工回补
 * allowed_paths 两轮。本模块在 plan 完成时做静态引用扫描，把候选透传/聚合文件提前
 * 亮给 agent（warning 不阻断）：判定是语义，agent 拍板补不补。
 *
 * 两个信号（语言覆盖 py/js/ts/mjs/cjs/jsx/tsx/java 的 import/require 静态文本匹配）：
 *   - direct：仓内文件 import 了 allowed_paths 里的模块（改被 facade 引用的模块，
 *     facade 常需同步改——转发签名/挂载点）；
 *   - aggregate：仓内文件 import 了该模块同目录下 ≥2 个模块（聚合器/注册表形态，
 *     新增同目录模块几乎必然要在此登记——service.py 挂 router 即此形态）。
 *
 * 启发式 → 恒 advisory：候选只列不改，由 agent 判定补 allowed_paths / design §6，
 * 或确认无关忽略。性能护栏：allowed 条目 > 100 或仓内源码文件 > 5000 时静默跳过。
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'fs'
import { join, dirname, basename, extname, resolve } from 'path'

const SOURCE_EXTS = new Set(['.py', '.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs', '.java'])
const SKIP_DIRS = new Set([
  '.git', 'node_modules', 'dist', 'build', 'out', '.next', '__pycache__',
  '.venv', 'venv', 'env', '.sillyspec', '.worktrees', '.claude', '.runtime',
  'coverage', 'target', '.idea', '.vscode',
])
const MAX_ALLOWED_ENTRIES = 100
const MAX_REPO_FILES = 5000
const MAX_FILE_BYTES = 512 * 1024

const toPosix = (p) => String(p).replace(/\\/g, '/')

/** 递归收集仓内源码文件（posix 相对路径），带总量护栏。 */
function walkSourceFiles(root, out = []) {
  if (out.length > MAX_REPO_FILES) return out
  let names
  try { names = readdirSync(root) } catch { return out }
  for (const name of names) {
    if (SKIP_DIRS.has(name)) continue
    const abs = join(root, name)
    let st
    try { st = statSync(abs) } catch { continue }
    if (st.isDirectory()) walkSourceFiles(abs, out)
    else if (st.isFile() && SOURCE_EXTS.has(extname(name).toLowerCase()) && st.size <= MAX_FILE_BYTES) {
      out.push(toPosix(join(root, name)))
      if (out.length > MAX_REPO_FILES) return out
    }
  }
  return out
}

/** 从源码文本提取 import/require 说明符（py dotted + js/ts path-ish）。 */
export function extractImportSpecifiers(text, ext) {
  const specs = new Set()
  if (ext === '.py') {
    // from X import a, b → 记 pkg 本身 + 逐名拼 'X.a'/'X.b'（前者保 from X.y import sym 的
    // 直接引用形态，后者保 service.py 聚合挂载形态：from daemon.routers import users, orders）
    for (const m of text.matchAll(/\bfrom\s+([.\w]+)\s+import\s+([^\n#]+)/g)) {
      specs.add(m[1])
      const names = m[2].split(',')
        .map(s => s.trim().split(/\s+as\s+/i)[0].trim())
        .filter(n => /^\w+$/.test(n))
      for (const n of names) specs.add(`${m[1]}.${n}`)
    }
    for (const m of text.matchAll(/(?:^|\n)\s*import\s+([\w.]+)/g)) specs.add(m[1])
  } else if (ext === '.java') {
    for (const m of text.matchAll(/\bimport\s+([\w.]+)\s*;/g)) specs.add(m[1])
  } else {
    for (const m of text.matchAll(/(?:from\s+|require\(\s*|import\(\s*)['"]([^'"]+)['"]/g)) specs.add(m[1])
  }
  return [...specs]
}

/** 说明符是否指向模块名 mod（`m` / `pkg.m` / `./m` / `../d/m` 等尾部命中形态）。 */
export function specRefsModule(spec, mod) {
  if (!spec || !mod) return false
  if (spec === mod) return true
  return spec.endsWith('.' + mod) || spec.endsWith('/' + mod)
}

/**
 * 探测 allowed_paths 之外的 facade/聚合候选文件。
 *
 * @param {{ cwd: string, allowedPaths: string[] }} opts
 * @returns {{ skipped: boolean, reason: string|null, candidates: Array<{file: string, via: string[]}> }}
 */
export function findFacadeCandidates({ cwd, allowedPaths }) {
  const root = cwd || process.cwd()
  const allowed = (allowedPaths || []).map(toPosix).filter(p => !p.includes('*'))
  if (allowed.length === 0) return { skipped: true, reason: 'no-allowed-paths', candidates: [] }
  if (allowed.length > MAX_ALLOWED_ENTRIES) return { skipped: true, reason: 'allowed-too-many', candidates: [] }

  const files = walkSourceFiles(root)
  if (files.length > MAX_REPO_FILES) return { skipped: true, reason: 'repo-too-large', candidates: [] }

  const allowedSet = new Set(allowed)
  const isAllowed = (abs) => allowed.some(a => abs === a || abs.endsWith('/' + a) || a.endsWith('/' + abs) || abs.replace(/\.[^.]+$/, '') === a.replace(/\.[^.]+$/, ''))

  // 目录 → 该目录下模块名索引（聚合信号用：R import 同目录 ≥2 模块 = 聚合器）
  const dirModules = new Map()
  for (const f of files) {
    const d = dirname(f)
    if (!dirModules.has(d)) dirModules.set(d, new Set())
    dirModules.get(d).add(basename(f, extname(f)))
  }

  // 预读一遍源码 import（file → specs），两信号共用
  const fileSpecs = []
  for (const f of files) {
    if (isAllowed(f)) continue
    let text
    try { text = readFileSync(f, 'utf8') } catch { continue }
    fileSpecs.push({ file: f, specs: extractImportSpecifiers(text, extname(f).toLowerCase()) })
  }

  // 逐 allowed 文件探测 direct + aggregate 命中
  const byFile = new Map()
  for (const p of allowed) {
    const mod = basename(p, extname(p))
    // allowed 是相对仓根路径，目录索引键是绝对路径（walk 产物）——resolve 对齐再查
    const dirKey = toPosix(resolve(root, dirname(p)))
    const dirLabel = toPosix(dirname(p))
    const dirModSet = dirModules.get(dirKey) || new Set()
    for (const { file, specs } of fileSpecs) {
      const via = []
      if (specs.some(s => specRefsModule(s, mod))) via.push(`direct import of ${mod}`)
      // aggregate：R 引用 mod 同目录 ≥2 个不同仓内模块（mod 自身可不在——新增模块形态）
      const hitMods = new Set()
      for (const s of specs) {
        for (const b of dirModSet) {
          if (specRefsModule(s, b)) { hitMods.add(b); break }
        }
      }
      if (hitMods.size >= 2) via.push(`aggregates ≥2 modules of ${dirLabel === '.' ? './' : dirLabel + '/'}`)
      if (via.length === 0) continue
      const existing = byFile.get(file) || []
      for (const v of via) if (!existing.includes(v)) existing.push(v)
      byFile.set(file, existing)
    }
  }
  const candidates = [...byFile.entries()]
    .map(([file, via]) => ({ file: toPosix(file), via }))
    .sort((a, b) => a.file.localeCompare(b.file))
  return { skipped: false, reason: null, candidates }
}

/**
 * plan 门消费入口：探测 + 打印（advisory，不阻断）。allowed 集与 apply Gate1 同源
 * （resolveApplyAllowSet 的主仓切片），确保「预检亮出的候选」与「执行期会拦的门」
 * 用同一份清单口径。
 */
export function warnFacadeCandidateFiles({ cwd, changeName, allowSet }) {
  try {
    const r = findFacadeCandidates({ cwd, allowedPaths: [...(allowSet || [])] })
    if (r.skipped || r.candidates.length === 0) return r
    console.warn(`\n⚠️  plan 预检：${r.candidates.length} 个 allowed_paths 外的「透传/聚合」候选文件（advisory，不阻断）：`)
    for (const c of r.candidates.slice(0, 10)) {
      console.warn(`   - ${c.file}（${[...new Set(c.via)].join('; ')}）`)
    }
    if (r.candidates.length > 10) console.warn(`   …还有 ${r.candidates.length - 10} 个`)
    console.warn('   若属「透传必经文件」（facade 转发/路由挂载/注册登记——改 allowed 模块必须同步改它才生效）：')
    console.warn('   现在补进对应 TaskCard allowed_paths 或 design §6 清单，避免执行期 apply Gate1 拦截后手工回补；')
    console.warn('   确认无关则忽略。执行期有据越界另有出口（review.json 声明 changedFiles，apply 有审计放行）。')
    return r
  } catch (e) {
    console.warn(`⚠️  facade 候选探测失败（advisory 跳过）: ${e.message}`)
    return { skipped: true, reason: 'error', candidates: [] }
  }
}
