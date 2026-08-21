/**
 * 第三批机械化测试（2026-08-21 agent-手工产出审计）
 *
 * 覆盖：
 * 1. runVerifyProbes：探针1（design 清单文件 TODO 标记）、探针3（allowed_paths 定位模块目录
 *    递归找测试文件，co-located 命中/缺失两态）、探针6（git 删除 × design 声明三态）
 * 2. verify-result 骨架：七章节 + 探针预填 + 结论「待填」（gate 判不过语义）
 * 3. generateModuleImpactSkeleton：module-map paths 前缀归类 + 未匹配清单
 * 4. endpoints extract CLI：FastAPI 装饰器静态扫描 → endpoints.json
 * 5. fixScanDocHeaders：无 header 补齐、有 header 跳过、幂等
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import { runVerifyProbes, renderVerifyProbesReport, generateVerifyResultSkeleton } from '../src/verify-probes.js'
import { generateModuleImpactSkeleton, parseModuleMapPaths } from '../src/module-impact.js'
import { fixScanDocHeaders } from '../src/scan-postcheck.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const cliBin = join(__dirname, '..', 'bin', 'sillyspec.js')

let passed = 0
let failed = 0
const tmpRoots = []

function assert(cond, msg) {
  if (cond) { console.log(`  ✅ PASS: ${msg}`); passed++ }
  else { console.log(`  ❌ FAIL: ${msg}`); failed++ }
}

function git(dir, args) {
  return spawnSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).stdout.trim()
}

function makeFixture() {
  const proj = mkdtempSync(join(tmpdir(), 'vp3-'))
  tmpRoots.push(proj)
  const specBase = join(proj, '.sillyspec')
  git(proj, ['init', '-q'])
  git(proj, ['config', 'user.email', 't@t.local'])
  git(proj, ['config', 'user.name', 't'])
  writeFileSync(join(proj, '.gitignore'), '.sillyspec/\n')
  writeFileSync(join(proj, 'a.js'), 'console.log(1)\n')
  writeFileSync(join(proj, 'old-declared.js'), 'x\n')
  writeFileSync(join(proj, 'old-unlisted.js'), 'y\n')
  mkdirSync(join(proj, 'src'), { recursive: true })
  writeFileSync(join(proj, 'src', 'feature.js'), 'export const f = 1\n')
  writeFileSync(join(proj, 'src', 'feature.test.js'), 'test("f", () => {})\n')
  writeFileSync(join(proj, 'router.py'), 'from fastapi import APIRouter\nrouter = APIRouter()\n\n@router.get("/api/users/{uid}")\ndef get_user(uid):\n    return {}\n')
  git(proj, ['add', '.'])
  git(proj, ['commit', '-q', '-m', 'init'])
  const baseHash = git(proj, ['rev-parse', 'HEAD'])

  // worktree meta（in-place，baseHash 锚点供 resolveVerifyChangedFiles / module-impact 用）
  const metaDir = join(specBase, '.runtime', 'worktrees', 'c1')
  mkdirSync(metaDir, { recursive: true })
  writeFileSync(join(metaDir, 'meta.json'), JSON.stringify({
    changeName: 'c1', baseHash, mode: 'in-place-fallback', worktreePath: proj,
  }))

  // change 产物
  const changeDir = join(specBase, 'changes', 'c1')
  mkdirSync(join(changeDir, 'tasks'), { recursive: true })
  writeFileSync(join(changeDir, 'design.md'), [
    '## 文件变更清单',
    '',
    '| 操作 | 文件 | 说明 |',
    '|---|---|---|',
    '| 修改 | a.js | 加功能 |',
    '| 删除 | old-declared.js | 清理 |',
    '| 新增 | src/feature.js | 特性 |',
    '',
  ].join('\n'))
  writeFileSync(join(changeDir, 'tasks.md'), '- [ ] task-01: 特性\n- [ ] task-02: 无卡任务\n')
  writeFileSync(join(changeDir, 'tasks', 'task-01.md'),
    '---\nid: task-01\nallowed_paths: [src/feature.js]\n---\n# task-01\n')

  // 工作区改动：a.js 加 TODO 标记 + src 改动 + 删两个文件（一个声明删除、一个未声明）
  // （探针 1/6 消费工作树 vs HEAD；module-impact 消费 base..HEAD —— 测试后段再 commit）
  writeFileSync(join(proj, 'a.js'), 'console.log(2)\n// TODO: 修这个\n')
  writeFileSync(join(proj, 'src', 'feature.js'), 'export const f = 2 // FIXME: 待清理\n')
  rmSync(join(proj, 'old-declared.js'))
  rmSync(join(proj, 'old-unlisted.js'))

  // module-map（api 模块覆盖 src/；a.js 在根 → 未匹配）
  mkdirSync(join(specBase, 'docs', 'app', 'modules'), { recursive: true })
  writeFileSync(join(specBase, 'docs', 'app', 'modules', '_module-map.yaml'), [
    'schema_version: 2',
    'modules:',
    '  api:',
    '    status: active',
    '    doc: modules/api.md',
    '    paths:',
    '      - src/',
    '',
  ].join('\n'))

  // scan 文档（无 header）
  mkdirSync(join(specBase, 'docs', 'app', 'scan'), { recursive: true })
  writeFileSync(join(specBase, 'docs', 'app', 'scan', 'PROJECT.md'), '# Project\n内容\n')
  writeFileSync(join(specBase, 'docs', 'app', 'scan', 'ARCHITECTURE.md'), '---\nauthor: someone\ncreated_at: 2026-01-01 00:00:00\n---\n# Arch\n')

  return { cwd: proj, specBase, changeDir }
}

const fx = makeFixture()
try {
  console.log('--- 1. runVerifyProbes：探针 1/3/6 ---')
  {
    const r = runVerifyProbes({ cwd: fx.cwd, changeName: 'c1' })
    assert(r.probe1.matches.some(m => m.file === 'a.js' && m.content.includes('TODO')), '探针1 命中 a.js 的 TODO 标记（含行号）')
    assert(r.probe1.matches.every(m => typeof m.line === 'number'), '探针1 记录行号')
    assert(!r.probe1.matches.some(m => m.file.startsWith('.sillyspec/')), '探针1 不扫 .sillyspec')

    const t1 = r.probe3.tasks.find(t => t.task === 'task-01')
    assert(t1 && t1.hasTest && t1.testFiles.some(f => f.includes('feature.test.js')), '探针3 task-01 命中 co-located 测试文件')
    const t2 = r.probe3.tasks.find(t => t.task === 'task-02')
    assert(t2 && t2.located === false, '探针3 无卡任务标记无法定位')

    const del1 = r.probe6.deletions.find(d => d.path === 'old-declared.js')
    assert(del1 && del1.verdict.includes('合规'), '探针6 声明删除 → 合规')
    const del2 = r.probe6.deletions.find(d => d.path === 'old-unlisted.js')
    assert(del2 && del2.verdict.includes('未声明'), '探针6 未列出删除 → 未声明')
    assert(r.probe6.deletions.every(d => !d.path.startsWith('.sillyspec/')), '探针6 排除 .sillyspec')

    console.log('--- 2. 报告渲染 + verify-result 骨架 ---')
    const report = renderVerifyProbesReport(r)
    assert(report.includes('探针 1') && report.includes('探针 6'), '渲染含各探针段落')
    const sk = generateVerifyResultSkeleton(r)
    for (const sec of ['结论', '任务完成度', '设计一致性', '探针结果', '测试结果', '风险等级', 'Runtime Evidence']) {
      assert(sk.includes(sec), `骨架含「${sec}」章节`)
    }
    assert(sk.includes('待填'), '结论留待填（gate 判不过，防骨架直接过门）')
    assert(sk.includes('feature.test.js'), '骨架探针结果预填了机械产物')
    assert((sk.match(/<!--TODO-->/g) || []).length > 0, '语义章节留 TODO 占位')
  }

  console.log('--- 3. module-impact 骨架（提交后 base..HEAD 生效）---')
  {
    // module-impact 的 diff 源是 base..HEAD（commit diff）——把工作区改动 commit 掉
    git(fx.cwd, ['add', '.'])
    git(fx.cwd, ['commit', '-q', '-m', 'feat: c1'])
    const paths = parseModuleMapPaths(readFileSync(join(fx.specBase, 'docs', 'app', 'modules', '_module-map.yaml'), 'utf8'))
    assert(paths.get('api') && paths.get('api').includes('src/'), 'module-map paths 解析')

    const mi = generateModuleImpactSkeleton({ cwd: fx.cwd, changeName: 'c1' })
    assert(mi !== null, '生成骨架（有 module-map + diff）')
    assert(mi.matchedCount >= 1 && mi.markdown.includes('src/feature.js'), 'src/feature.js 归属 api 模块（matched=' + mi.matchedCount + ' unmatched=' + mi.unmatchedCount + '）')
    assert(mi.unmatchedCount >= 1, '根路径文件（a.js 等）未匹配')
    assert(mi.markdown.includes('模块影响矩阵') && mi.markdown.includes('未匹配文件'), '骨架含两必需章节')
    assert((mi.markdown.match(/<!--TODO-->/g) || []).length > 0, '影响类型列留 TODO')
  }

  console.log('--- 4. endpoints extract CLI ---')
  {
    const res = spawnSync(process.execPath, [cliBin, 'endpoints', 'extract', '--change', 'c1', '--files', 'router.py'], {
      cwd: fx.cwd, encoding: 'utf8', timeout: 60_000, stdio: ['pipe', 'pipe', 'pipe'],
    })
    const out = (res.stdout || '') + (res.stderr || '')
    assert(res.status === 0, `exit 0（实际 ${res.status}；${out.slice(0, 200)}）`)
    const artifactPath = join(fx.specBase, '.runtime', 'contract-artifacts', 'c1', 'scan', 'endpoints.json')
    assert(existsSync(artifactPath), 'endpoints.json 落盘（verifyApiParity 读路径）')
    const artifact = JSON.parse(readFileSync(artifactPath, 'utf8'))
    assert(artifact.endpoints.some(e => e.method === 'GET' && e.path.includes('/api/users/')), 'FastAPI 装饰器提取 GET /api/users/{uid}')
  }

  console.log('--- 5. scan-fix-headers ---')
  {
    const r1 = fixScanDocHeaders({ cwd: fx.cwd })
    assert(r1.fixed.length === 1 && r1.fixed[0].endsWith('PROJECT.md'), '无 header 的 PROJECT.md 被补')
    assert(r1.skipped.length === 1 && r1.skipped[0].endsWith('ARCHITECTURE.md'), '有 header 的 ARCHITECTURE.md 跳过')
    const content = readFileSync(join(fx.specBase, 'docs', 'app', 'scan', 'PROJECT.md'), 'utf8')
    assert(/^---\nauthor: t\ncreated_at: /m.test(content), '补的 frontmatter 含 author=t + created_at')
    const r2 = fixScanDocHeaders({ cwd: fx.cwd })
    assert(r2.fixed.length === 0 && r2.skipped.length === 2, '幂等：二跑全跳过')
  }
} finally {
  for (const t of tmpRoots) { try { rmSync(t, { recursive: true, force: true }) } catch {} }
}

console.log(`\n合计: ${passed} 通过, ${failed} 失败`)
process.exit(failed > 0 ? 1 : 0)
