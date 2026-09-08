/**
 * docs migrate：确定性批量路径前缀迁移（2026-09-08-docs-fix-capability / D-002+D-004）。
 *
 * 动机：文档引用批量路径迁移（如 modules/ → backend/app/modules/）是已知改名规则的确定性
 * 替换，不该靠手写临时脚本。薄模块——import 复用 docs-check 的提取/校验/写回，不复制解析正则。
 *
 * 语义（D-002）：只做用户显式给定的 --from/--to 前缀替换（零推断）；改动面=docs check 所辖
 * .md 文件中的 file:line 引用文本；默认 dry-run 列计划，--apply 才写盘；写盘后自动 docs check
 * 复核（防 from/to 写反）。不碰 git 历史、不改非引用文本。
 *
 * exit code（CLI 层）：0=dry-run 零计划或 --apply 后 postCheck 全绿；1=--apply 后仍失效或
 * unverified>0；2=用法/配置错误；dry-run 有计划恒 0（预览不判成败）。
 *
 * 纯 Node 内置模块零依赖（与 docs-check.js 同款）。
 */
import { join } from 'node:path'
import { existsSync, readFileSync } from 'node:fs'
import {
  collectDocRefs,
  resolveCandidates,
  readDocsCheckConfig,
  applyFixes,
  runDocsCheck,
  DEFAULT_DOC_PATHS,
  walkGlob,
} from './docs-check.js'

/**
 * 生成迁移计划（纯函数，不写盘）。
 * 文档集与 docs check 同源（readDocsCheckConfig paths/skip——校验面即改写面）。
 * @param {{ projectRoot: string, from: string, to: string, docs?: string[], paths?: string[], skip?: string[] }} opts
 *   from/to 为用户显式前缀（如 'modules/' → 'backend/app/modules/'）
 * @returns {{ plans: Array<{doc, docLine, ref, newRef, verified}>, scanned: number }}
 *   plans 按 doc+docLine 排序；verified=false 表示新路径经 resolveCandidates 验证 0 候选（unverified）
 */
export function planDocsMigrate(opts) {
  const { projectRoot, from, to } = opts || {}
  if (!projectRoot || typeof from !== 'string' || from === '' || typeof to !== 'string' || to === '') {
    throw new Error('planDocsMigrate: from/to 必填且非空')
  }
  const cfg = readDocsCheckConfig(projectRoot)
  const paths = (opts.paths && opts.paths.length > 0 ? opts.paths : null)
    || cfg.paths
    || DEFAULT_DOC_PATHS
  const skip = opts.skip || cfg.skip
  const docFiles = (opts.docs && opts.docs.length > 0)
    ? opts.docs
    : [...new Set(paths.flatMap(p => walkGlob(projectRoot, p, skip)))].sort()

  const plans = []
  const treeCache = new Map()
  for (const docRel of docFiles) {
    const docAbs = join(projectRoot, docRel)
    if (!existsSync(docAbs)) continue
    const md = readFileSync(docAbs, 'utf8')
    const refs = collectDocRefs(md)
    for (const r of refs) {
      if (r.repo) continue // 跨仓引用不迁移（repo:// 前缀）
      if (!r.file.startsWith(from)) continue
      if (from === to) continue // from=to 时 newRef === ref，无迁移意义（零计划）
      const newFile = to + r.file.slice(from.length)
      const linePart = r.end !== r.start ? `:${r.start}-${r.end}` : `:${r.start}`
      const newRef = newFile + linePart
      const newCandidates = resolveCandidates(projectRoot, newFile, treeCache)
      plans.push({
        doc: docRel,
        docLine: r.docLine,
        ref: r.ref,
        newRef,
        verified: newCandidates.length > 0,
      })
    }
  }
  plans.sort((a, b) => a.doc.localeCompare(b.doc) || a.docLine - b.docLine)
  return { plans, scanned: docFiles.length }
}

/**
 * 执行迁移：默认 dry-run 输出计划表；--apply 写盘（applyFixes）+ 自动 docs check 复核。
 * @param {{ projectRoot: string, from: string, to: string, apply?: boolean, docs?: string[], paths?: string[], skip?: string[] }} opts
 * @returns {{ plans, applied, skipped, unverified, postCheck?: {invalid, total} }}
 */
export function runDocsMigrate(opts) {
  const { apply = false } = opts || {}
  const { plans, scanned } = planDocsMigrate(opts)
  const unverified = plans.filter(p => !p.verified)

  if (!apply) {
    // dry-run：打印计划表，零写盘
    if (plans.length === 0) {
      console.log(`✅ docs migrate: 扫描 ${scanned} 个文档，无可迁移引用（from=${opts.from} 无匹配）`)
    } else {
      console.log(`📋 docs migrate 计划（dry-run 未写盘）：扫描 ${scanned} 个文档，${plans.length} 处引用可迁移${unverified.length > 0 ? `（${unverified.length} 处 unverified）` : ''}：`)
      for (const p of plans) {
        const mark = p.verified ? '✅' : '⚠️'
        console.log(`  ${mark} [${p.doc}:L${p.docLine}] ${p.ref} → ${p.newRef}${p.verified ? '' : '（目标不存在）'}`)
      }
      console.log(`\n确认后加 --apply 写盘；unverified 项请核对 from/to 是否写反。`)
    }
    return { plans, applied: 0, skipped: [], unverified: unverified.length }
  }

  // --apply：applyFixes 写盘（shape 一致，含 R-04 行内偏移防护）
  const { applied, skipped } = applyFixes(opts.projectRoot, plans)
  // 写盘后自动 docs check 复核（防 from/to 写反）
  const postCheck = runDocsCheck({
    projectRoot: opts.projectRoot,
    paths: opts.paths || null,
    skip: opts.skip || [],
  })
  console.log(`✅ docs migrate: ${applied} 处已写回${skipped.length > 0 ? `、${skipped.length} 处写回跳过` : ''}（${unverified.length} 处 unverified）。`)
  console.log(`📊 迁移后 docs check：${postCheck.invalid.length}/${postCheck.total} 处失效。`)
  if (unverified.length > 0) {
    console.warn(`⚠️ ${unverified.length} 处 unverified（目标不存在），请核对 from/to 是否写反：`)
    for (const p of unverified.slice(0, 10)) console.warn(`   - [${p.doc}:L${p.docLine}] ${p.ref} → ${p.newRef}`)
  }
  return {
    plans,
    applied,
    skipped,
    unverified: unverified.length,
    postCheck: { invalid: postCheck.invalid.length, total: postCheck.total },
  }
}
