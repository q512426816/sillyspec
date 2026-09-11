/**
 * validate-artifacts.js（P2-d，noai-ir-roadmap §5）：产物 schema 校验总命令的实现体。
 *
 * 背景：verify-facts 是唯一有真 validator 的 artifact（validateFactsV2），review.json/
 * verify-required-evidence/endpoints/module-map 各自散落或无独立校验入口。本模块把既有
 * 校验器聚合为一把伞（`sillyspec validate --change <c>`）：逐产物 pass/fail/skip 三态 +
 * exit 1 on fail——「新解析器写之前先过 schema」有了统一落点。
 *
 * 复用面（不重复造校验器）：verify-facts validateFactsV2 / task review validateReviewSchema /
 * stage review validateStageReviewSchema / module-map parseModuleMapSimple。轻形状检查仅覆盖
 * 无既有 validator 的 required-evidence 与 endpoints（容忍缺省，出场才算）。
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

function checkJson(path, fn) {
  if (!existsSync(path)) return { status: 'skip', reason: '不存在（未生成，不算失败）' }
  let data
  try {
    data = JSON.parse(readFileSync(path, 'utf8'))
  } catch (e) {
    return { path, status: 'fail', issues: [`JSON 解析失败: ${e.message}`] }
  }
  try {
    const issues = fn(data) || []
    return { path, status: issues.length > 0 ? 'fail' : 'pass', issues }
  } catch (e) {
    return { path, status: 'fail', issues: [e.message] }
  }
}

/**
 * 校验一个变更的全部结构化产物。
 * @returns {{ checks: Array<{ artifact: string, path?: string, status: 'pass'|'fail'|'skip', issues?: string[], reason?: string }>, ok: boolean }}
 */
export async function validateChangeArtifacts({ cwd, specBase, changeName, runtimeRoot }) {
  const checks = []
  const changeDir = join(specBase, 'changes', changeName)
  const rt = runtimeRoot || join(specBase, '.runtime')

  // ① verify-facts.json（既有真 validator）
  {
    const { validateFactsV2 } = await import('./verify-facts-schema.js')
    const r = checkJson(join(changeDir, 'verify-facts.json'), (d) => {
      const v = validateFactsV2(d)
      return v && !v.ok ? (v.errors || ['validateFactsV2 不通过']) : []
    })
    checks.push({ artifact: 'verify-facts.json', ...r })
  }

  // ② verify-required-evidence.json（轻形状：execute Task Review Gate 的 cannot_verify 账）
  {
    const r = checkJson(join(changeDir, 'verify-required-evidence.json'), (d) => {
      const issues = []
      if (!d || typeof d !== 'object' || !Array.isArray(d.items)) issues.push('顶层缺 items 数组')
      else {
        for (const it of d.items) {
          if (!it || typeof it.task !== 'string') issues.push(`items[].task 非字符串: ${JSON.stringify(it).slice(0, 60)}`)
          if (!Array.isArray(it.evidence)) issues.push(`${it && it.task}: evidence 非数组`)
        }
      }
      return issues
    })
    checks.push({ artifact: 'verify-required-evidence.json', ...r })
  }

  // ③ task review.json（最新 execute run 的逐 task 产物——既有 validateReviewSchema）
  {
    const markerPath = join(rt, `current-execute-run-id-${changeName}`)
    const runId = existsSync(markerPath) ? readFileSync(markerPath, 'utf8').trim() : null
    if (!runId) {
      checks.push({ artifact: 'task reviews', status: 'skip', reason: '无 execute run marker（未经 execute 或已清理）' })
    } else {
      const tasksDir = join(rt, 'execute-runs', runId, 'tasks')
      const files = existsSync(tasksDir) ? readdirSync(tasksDir).filter((d) => existsSync(join(tasksDir, d, 'review.json'))).map((d) => join(tasksDir, d, 'review.json')) : []
      if (files.length === 0) {
        checks.push({ artifact: 'task reviews', status: 'skip', reason: `run ${runId} 无 review.json` })
      } else {
        const { validateReviewSchema } = await import('./task-review.js')
        const issues = []
        for (const f of files) {
          try {
            const v = validateReviewSchema(JSON.parse(readFileSync(f, 'utf8')))
            if (v && !v.ok) issues.push(`${f}: ${(v.errors || ['schema 不通过']).join('；').slice(0, 120)}`)
          } catch (e) {
            issues.push(`${f}: ${e.message}`)
          }
        }
        checks.push({ artifact: `task reviews（${files.length} 个，run ${runId}）`, status: issues.length > 0 ? 'fail' : 'pass', issues })
      }
    }
  }

  // ④ stage reviews（brainstorm/plan/execute 的阶段评审产物——既有 validateStageReviewSchema）
  {
    const dir = join(rt, 'stage-reviews')
    const files = existsSync(dir) ? readdirSync(dir).filter((d) => existsSync(join(dir, d, 'review.json'))).map((d) => join(dir, d, 'review.json')) : []
    if (files.length === 0) {
      checks.push({ artifact: 'stage reviews', status: 'skip', reason: '无 stage-reviews 产物' })
    } else {
      const { validateStageReviewSchema } = await import('./stage-review.js')
      const issues = []
      for (const f of files) {
        try {
          const v = validateStageReviewSchema(JSON.parse(readFileSync(f, 'utf8')))
          if (v && !v.ok) issues.push(`${f}: ${(v.errors || ['schema 不通过']).join('；').slice(0, 120)}`)
        } catch (e) {
          issues.push(`${f}: ${e.message}`)
        }
      }
      checks.push({ artifact: `stage reviews（${files.length} 份）`, status: issues.length > 0 ? 'fail' : 'pass', issues })
    }
  }

  // ⑤ endpoints 契约产物（contract-artifacts/<change>/<task>/endpoints.json——轻形状）
  {
    const dir = join(rt, 'contract-artifacts', changeName)
    const files = existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).flatMap((d) => existsSync(join(dir, d.name, 'endpoints.json')) ? [join(dir, d.name, 'endpoints.json')] : []) : []
    if (files.length === 0) {
      checks.push({ artifact: 'endpoints', status: 'skip', reason: '无 contract-artifacts 产物' })
    } else {
      const issues = []
      for (const f of files) {
        const r = checkJson(f, (d) => (!d || typeof d !== 'object' || (!Array.isArray(d.endpoints) && !Array.isArray(d)) ? ['缺 endpoints 数组'] : []))
        if (r.status === 'fail') issues.push(`${f}: ${(r.issues || []).join('；')}`)
      }
      checks.push({ artifact: `endpoints（${files.length} 份）`, status: issues.length > 0 ? 'fail' : 'pass', issues })
    }
  }

  // ⑥ module-map（全局一份/多份——schema_version 2 + canonical 解析可读）
  {
    const { parseModuleMapSimple } = await import('./modules.js')
    const docsRoot = join(specBase, 'docs')
    const maps = existsSync(docsRoot) ? readdirSync(docsRoot, { withFileTypes: true }).filter((d) => d.isDirectory() && existsSync(join(docsRoot, d.name, 'modules', '_module-map.yaml'))).map((d) => join(docsRoot, d.name, 'modules', '_module-map.yaml')) : []
    if (maps.length === 0) {
      checks.push({ artifact: 'module-map', status: 'skip', reason: '无 _module-map.yaml（未 scan）' })
    } else {
      const issues = []
      for (const m of maps) {
        const text = readFileSync(m, 'utf8')
        const sv = text.match(/^schema_version:\s*(\d+)/m)
        if (!sv) issues.push(`${m}: 缺 schema_version 声明`)
        else if (sv[1] !== '2') issues.push(`${m}: schema_version=${sv[1]}（期望 2）`)
        if (!parseModuleMapSimple(text) || Object.keys(parseModuleMapSimple(text)).length === 0) issues.push(`${m}: canonical 解析 0 模块`)
      }
      checks.push({ artifact: `module-map（${maps.length} 份）`, status: issues.length > 0 ? 'fail' : 'pass', issues })
    }
  }

  return { checks, ok: checks.every((c) => c.status !== 'fail') }
}

export function renderValidateReport(result) {
  const lines = ['🧪 产物 schema 校验（validate 总命令）']
  for (const c of result.checks) {
    const mark = c.status === 'pass' ? '✅' : c.status === 'skip' ? '⏭️ ' : '❌'
    lines.push(`   ${mark} ${c.artifact}${c.status === 'skip' ? ' — ' + (c.reason || '跳过') : ''}`)
    for (const i of (c.issues || []).slice(0, 5)) lines.push(`      - ${i}`)
  }
  lines.push(result.ok ? '\n✅ 全部在场产物校验通过（skip = 未生成不算失败）' : `\n❌ ${result.checks.filter((c) => c.status === 'fail').length} 类产物校验失败`)
  return lines.join('\n')
}
