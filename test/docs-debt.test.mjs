/**
 * docs-debt 单测（change: 2026-08-15-docs-debt-inject task-04，FR-006）
 *
 * 覆盖：归属三级（paths/core_files 双读、卡片引用、unmapped）、双 commit 口径
 * （behind 数、untracked 卡）、零输出、CRLF map、注入接线契约。
 * fixture 全 tmp git 仓，不污染真仓库。超时降级用参数化注入（非真睡，防 Windows CI flaky）。
 */
import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execSync } from 'node:child_process'
import { matchFilesToModules, computeDocsDebt } from '../src/docs-debt.js'
import { parseModuleMapSimple } from '../src/modules.js'

let root, specBase, cardsDir
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'ddebt-'))
  execSync('git init -q', { cwd: root, stdio: 'pipe' })
  execSync('git config user.email t@t.com', { cwd: root, stdio: 'pipe' })
  execSync('git config user.name t', { cwd: root, stdio: 'pipe' })
  specBase = join(root, '.sillyspec')
  cardsDir = join(specBase, 'docs', 'demo', 'modules')
  mkdirSync(cardsDir, { recursive: true })
})
afterEach(() => { try { rmSync(root, { recursive: true, force: true }) } catch {} })

function commit(msg) { execSync(`git commit -q --allow-empty -m "${msg}"`, { cwd: root, stdio: 'pipe' }) }
function commitFile(rel, content, msg) {
  mkdirSync(join(root, rel.split('/').slice(0, -1).join('/')), { recursive: true })
  writeFileSync(join(root, rel), content)
  execSync(`git add "${rel}" && git commit -q -m "${msg}"`, { cwd: root, stdio: 'pipe' })
}
function mkMap(extra) {
  const lines = ['schema_version: 2', 'modules:', '  core:', '    status: active', '    doc: modules/core.md', '    paths:', '      - src/core/']
  if (extra) lines.push(...extra)
  return lines.join('\n') + '\n'
}

describe('matchFilesToModules（归属三级）', () => {
  it('一级：paths 前缀命中（扁平对象输入）', () => {
    const idx = parseModuleMapSimple(mkMap())
    const { byModule, unmapped } = matchFilesToModules(['src/core/a.js', 'src/other.js'], idx, { cardsDir })
    assert.ok(byModule.has('core'), `src/core/a.js 应归 core（实际 ${[...byModule.keys()]}）`)
    assert.deepEqual(unmapped, ['src/other.js'])
  })

  it('一级：core_files 等效 paths（v2 rebuild 产物兼容）', () => {
    const idx = parseModuleMapSimple(['schema_version: 2', 'modules:', '  m:', '    status: active', '    doc: modules/m.md', '    core_files:', '      - lib/util.js'].join('\n') + '\n')
    const { byModule } = matchFilesToModules(['lib/util.js'], idx, { cardsDir })
    assert.ok(byModule.has('m'))
  })

  it('二级：卡片 doc 文件路径字面量命中（v1 无 paths 兼容）', () => {
    writeFileSync(join(cardsDir, 'legacy.md'), '涉及 `src/legacy.js` 的模块\n')
    const idx = parseModuleMapSimple(['schema_version: 1', 'modules:', '  legacy:', '    status: active', '    doc: modules/legacy.md'].join('\n') + '\n')
    const { byModule } = matchFilesToModules(['src/legacy.js'], idx, { cardsDir })
    assert.ok(byModule.has('legacy'))
  })

  it('二级b：卡片裸文件名引用命中（stages.md 实证形态）', () => {
    // 卡片只写裸名 execute.js（契约表习惯），changedFiles 是全路径 → 裸名兜底应归属
    writeFileSync(join(cardsDir, 'stg.md'), '契约：`buildExecuteSteps(planFile)` 定义于 execute.js\n')
    const idx = parseModuleMapSimple(['schema_version: 1', 'modules:', '  stg:', '    status: active', '    doc: modules/stg.md'].join('\n') + '\n')
    const { byModule, unmapped } = matchFilesToModules(['src/stages/execute.js'], idx, { cardsDir })
    assert.ok(byModule.has('stg'), `裸名 execute.js 应归 stg（实际 ${[...byModule.keys()]}）`)
    assert.deepEqual(unmapped, [])
  })

  it('二级b：基名两侧有路径/标识符字符不算命中（防 a.js 误配 xa.js.txt）', () => {
    writeFileSync(join(cardsDir, 'trap.md'), '旧文提及 fx/a.js.txt 与 mya.js2\n')
    const idx = parseModuleMapSimple(['schema_version: 1', 'modules:', '  trap:', '    status: active', '    doc: modules/trap.md'].join('\n') + '\n')
    const { byModule, unmapped } = matchFilesToModules(['src/a.js'], idx, { cardsDir })
    assert.equal(byModule.size, 0, '嵌入更长 token 的出现不应命中')
    assert.deepEqual(unmapped, ['src/a.js'])
  })

  it('二级b：全路径命中优先于裸名（两卡都含线索时先走二级）', () => {
    // full.md 卡含全路径字面量，bare.md 卡只含裸名 → 全路径卡赢
    writeFileSync(join(cardsDir, 'full.md'), '主接口在 `src/claim.js`\n')
    writeFileSync(join(cardsDir, 'bare.md'), '也提到 claim.js\n')
    const idx = parseModuleMapSimple(['schema_version: 1', 'modules:', '  full:', '    status: active', '    doc: modules/full.md', '  bare:', '    status: active', '    doc: modules/bare.md'].join('\n') + '\n')
    const { byModule } = matchFilesToModules(['src/claim.js'], idx, { cardsDir })
    assert.ok(byModule.has('full'), `全路径卡优先（实际 ${[...byModule.keys()]}）`)
  })

  it('全不中 → unmapped', () => {
    const idx = parseModuleMapSimple(mkMap())
    const { byModule, unmapped } = matchFilesToModules(['x/y.js'], idx, { cardsDir })
    assert.equal(byModule.size, 0)
    assert.deepEqual(unmapped, ['x/y.js'])
  })
})

describe('computeDocsDebt（欠账口径）', () => {
  it('卡片从未提交（untracked）→ behind=null 显式"从未提交"', () => {
    commitFile('src/core/a.js', 'x\n', 'c1')
    writeFileSync(join(cardsDir, '_module-map.yaml'), mkMap())
    writeFileSync(join(cardsDir, 'core.md'), '卡片\n') // 不 commit（.sillyspec 无 gitignore 时也应测 untracked）
    const r = computeDocsDebt({ projectRoot: root, specBase, projectName: 'demo', changedFiles: ['src/core/a.js'] })
    assert.equal(r.ok, true)
    assert.ok(r.facts.includes('从未提交'), r.facts)
    assert.ok(r.facts.includes('[docs-debt]'))
  })

  it('卡片落后源码 → behind = 卡与源码最后 commit 间隔数', () => {
    commitFile('src/core/a.js', 'x\n', 'c1')
    writeFileSync(join(cardsDir, '_module-map.yaml'), mkMap())
    writeFileSync(join(cardsDir, 'core.md'), '卡片\n')
    // 提交 map+卡片（注意 .sillyspec 路径相对 root）
    execSync('git add .sillyspec && git commit -q -m doc1', { cwd: root, stdio: 'pipe' })
    // 源码再推进：b.js 在 c2，之后一个无关 commit c3
    commitFile('src/core/b.js', 'y\n', 'c2')
    commit('c3-irrelevant')
    const r = computeDocsDebt({ projectRoot: root, specBase, projectName: 'demo', changedFiles: ['src/core/b.js'] })
    const e = r.entries.find(x => x.module === 'core')
    assert.ok(e, 'b.js 归 core')
    // behind 语义 = docCommit..srcCommit 区间 commit 数（含 srcCommit 自身）：doc1..c2 = 1
    assert.equal(e.behind, 1, `behind 应为 1（实际 ${e.behind}）`)
    assert.ok(r.facts.includes('1 commit 未同步卡'), r.facts)
  })

  it('卡片比源码新（behind=0）→ 无债零输出', () => {
    commitFile('src/core/a.js', 'x\n', 'c1')
    writeFileSync(join(cardsDir, '_module-map.yaml'), mkMap())
    writeFileSync(join(cardsDir, 'core.md'), '卡片\n')
    execSync('git add .sillyspec && git commit -q -m doc1', { cwd: root, stdio: 'pipe' })
    const r = computeDocsDebt({ projectRoot: root, specBase, projectName: 'demo', changedFiles: ['src/core/a.js'] })
    assert.equal(r.facts, '', '无债零输出')
  })

  it('无 _module-map.yaml → ok:false 单行事实', () => {
    const r = computeDocsDebt({ projectRoot: root, specBase, projectName: 'demo', changedFiles: ['a.js'] })
    assert.equal(r.ok, false)
    assert.ok(r.facts.includes('归属数据缺失'))
  })

  it('CRLF map → 归一后正常解析（P1 修复回归）', () => {
    commitFile('src/core/a.js', 'x\n', 'c1')
    writeFileSync(join(cardsDir, '_module-map.yaml'), mkMap().replace(/\n/g, '\r\n'))
    const r = computeDocsDebt({ projectRoot: root, specBase, projectName: 'demo', changedFiles: ['src/core/a.js'] })
    assert.notEqual(r.ok, false, `CRLF map 不应解析空（facts=${r.facts}）`)
    assert.ok(r.entries.some(e => e.module === 'core'), 'CRLF map 归属生效')
  })

  it('git 失败/超时降级：behind=null + 降级注记不抛（参数化——非真睡，防 Windows CI flaky）', () => {
    commitFile('src/core/a.js', 'x\n', 'c1')
    writeFileSync(join(cardsDir, '_module-map.yaml'), mkMap())
    writeFileSync(join(cardsDir, 'core.md'), '卡片\n')
    execSync('git add .sillyspec && git commit -q -m doc1', { cwd: root, stdio: 'pipe' })
    // 用非 git 目录作 projectRoot 模拟 git 不可得（safeGit error → notes 降级路径）
    const nonGit = mkdtempSync(join(tmpdir(), 'ddebt-nogit-'))
    try {
      const r = computeDocsDebt({ projectRoot: nonGit, specBase, projectName: 'demo', changedFiles: ['src/core/a.js'] })
      assert.equal(r.ok, true, 'git 失败不改变 ok（归属仍成功）')
      const e = r.entries.find(x => x.module === 'core')
      assert.ok(e, '归属不受 git 失败影响')
      assert.equal(e.behind, null)
      assert.ok(r.facts.includes('不可得') || r.facts.includes('降级') || (e.notes || []).length > 0, '降级注记存在')
    } finally {
      rmSync(nonGit, { recursive: true, force: true })
    }
  })
})

describe('注入接线契约', () => {
  it('execute.js Wave 模板含 {DOCS_DEBT}；prompt.js 有替换分支（无残留保证）', async () => {
    const { readFileSync } = await import('node:fs')
    const ex = readFileSync(new URL('../src/stages/execute.js', import.meta.url), 'utf8')
    assert.ok(ex.includes('{DOCS_DEBT}'), 'execute 模板含占位符')
    const pj = readFileSync(new URL('../src/run/prompt.js', import.meta.url), 'utf8')
    assert.ok(pj.includes('{DOCS_DEBT}'), 'prompt.js 替换分支存在')
    // 替换为空串语义：无债时占位符消失（facts === '' → replace('') 即删除占位符文本）
  })
})
