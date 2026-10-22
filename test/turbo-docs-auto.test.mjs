/**
 * turbo-docs-auto.test.mjs — turbo docs-auto 常设授权档（2026-10-23-turbo-docs-auto）
 *
 * 仓主 local.yaml 一行授权 + CLI 按面自动降档（fail-closed 判定）：
 *   ① 配置+纯文档面（盲维实质作答必评的对照面）→ 收口一次完成：无评审任务书、授权源留痕行、
 *      gate reason 含 docs-auto 且不含「用户显式触发」（FR-01/FR-03）
 *   ② 同面未配置 → 评审照常定档（任务书 exit 1）——豁免来自配置而非面（FR-02 零回归锚）
 *   ③ 配置+src 面 → 不降档，评审照常（FR-02 fail-closed）
 *   ④ 旗标档 reason 原样（用户显式触发）+完成收口（FR-01 旗标不变）
 *   ⑤ unit：readFlowConfig turboDocsAuto 键三态 fail-soft（FR-04）
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFlowConfig } from '../src/flow.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CLI = join(ROOT, 'src', 'index.js')

function gitRepo(dir) {
  const run = (args) => execFileSync('git', args, { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim()
  run(['init', '-q', '-b', 'main']); run(['config', 'user.email', 't@t']); run(['config', 'user.name', 't'])
  return run
}

/** thin 夹具：盲维四问实质作答（必评对照面）；docsOnly=true 交付仅文档，false 交付 src/work.js。 */
function setupThinChange(cwd, cn, { extraYaml = '', docsOnly = true, flagTurbo = false } = {}) {
  const run = gitRepo(cwd)
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'project:\n  type: generic\ncommands:\n  test: "node exit0.js"\nflow:\n  mode: thin\n' + extraYaml)
  writeFileSync(join(cwd, 'base.txt'), 'base\n')
  run(['add', '.']); run(['commit', '-q', '-m', 'base'])
  const env = { ...process.env, SILLYSPEC_WATCHER: '0' }
  const s1 = spawnSync(process.execPath, [CLI, '--dir', cwd, 'flow', 'start', '--change', cn, '--autopilot', ...(flagTurbo ? ['--turbo'] : []), '--input', 'docs-auto 档 e2e 夹具\n\n成功标准：\n- 降档行为'], { cwd, encoding: 'utf8', timeout: 120_000, env })
  assert.equal(s1.status, 0, `start 失败: ${s1.stderr}`)
  const base = join(cwd, '.sillyspec', 'changes', cn)
  // 盲维四问实质作答（2026-10-23 四子代理分析：实质作答即触发评审定档——本测试的必评对照面）
  writeFileSync(join(base, 'design.md'), readFileSync(join(base, 'design.md'), 'utf8')
    .replace(/^(本变更怎么解决问题|动了哪些函数|本方案最大的风险)([^\n]*)$/gm, '$&\n新增配置档与面判定，五个消费点读同一变量继承。')
    .replace(/^(1\. 乱序\/迟到到达|2\. 并发写|3\. 切换\/生命周期|4\. 作用域)([^\n]*)$/gm, '$&\n成立：面判定读 done 调用时点快照，与实测门/冻结面同一批只读事实，无新序依赖。')
    + '\n## 文件变更清单\n\n| 操作 | 路径 | 说明 |\n|---|---|---|\n| 新增 | docs/note.md | 交付 |\n')
  writeFileSync(join(base, 'requirements.md'), readFileSync(join(base, 'requirements.md'), 'utf8')
    .replace(/^- （待撰写.*$/gm, '- 系统 MUST 达成该条标准行为（协议夹具行为句）')
    .replace(/^FR-\d{2}: （待填.*$/gm, (m) => m.split(':')[0] + ': 不适用：协议测试夹具——无独立测试面')
  )
  writeFileSync(join(base, 'tasks.md'), '---\nauthor: fixture\n---\n\n# 任务注册表（Tasks）\n\n- [x] task-01: 交付文档面（e2e 夹具）\n')
  mkdirSync(join(cwd, 'docs'), { recursive: true })
  writeFileSync(join(cwd, 'docs', 'note.md'), '# note\n交付文档\n')
  const delivery = docsOnly ? ['docs/note.md'] : (() => { mkdirSync(join(cwd, 'src'), { recursive: true }); writeFileSync(join(cwd, 'src', 'work.js'), 'export const a = 1\n'); return ['docs/note.md', 'src/work.js'] })()
  writeFileSync(join(cwd, 'ev.txt'), 'tick evidence\n')
  run(['add', 'ev.txt', ...delivery])
  run(['commit', '-q', '-m', `docs (${cn}) (task-01)`])
  return { run, env, base }
}

const doneCmd = (cwd, cn, env, extra = []) =>
  spawnSync(process.execPath, [CLI, '--dir', cwd, 'flow', 'done', '--change', cn, ...extra], { cwd, encoding: 'utf8', timeout: 300_000, env })

test('① 配置+纯文档面：收口一次完成，无评审任务书，授权源留痕（盲维实质作答的必评对照面）', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'tda-'))
  const cn = '2026-09-01-tda-1'
  try {
    setupThinChange(cwd, cn, { extraYaml: 'turbo: docs-auto\n' })
    const s = doneCmd(cwd, cn, process.env)
    const out = s.stdout + s.stderr
    assert.equal(s.status, 0, `docs-auto 应一次完成: ${out.split('\n').slice(-8).join(' | ')}`)
    assert.ok(!out.includes('独立评审任务书'), '评审豁免（盲维实质作答的必评面被 docs-auto 豁免）')
    assert.match(out, /⚡ turbo\(docs-auto\)：提交\/冻结面纯文档/, '授权源留痕行在场')
    assert.match(out, /授权源 local\.yaml turbo: docs-auto/, '留痕行指明授权源')
    assert.match(out, /极速模式（local\.yaml turbo: docs-auto 常设授权/, 'gate reason 按 docs-auto 渲染')
    assert.ok(!out.includes('用户显式触发'), 'docs-auto 档不显示「用户显式触发」（防文案漂移）')
    assert.ok(existsSync(join(cwd, '.sillyspec', 'changes', 'archive', cn)), '归档完成')
  } finally { rmSync(cwd, { recursive: true, force: true, maxRetries: 3 }) }
})

test('② 同面未配置：评审照常定档（任务书 exit 1）——豁免来自配置而非面', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'tda-'))
  const cn = '2026-09-01-tda-2'
  try {
    setupThinChange(cwd, cn)
    const s = doneCmd(cwd, cn, process.env)
    const out = s.stdout + s.stderr
    assert.ok(s.status !== 0, '未配置必评面应停评审')
    assert.match(out, /独立评审任务书/, '任务书在场（盲维实质作答必评）')
    assert.ok(!out.includes('turbo(docs-auto)'), '无降档留痕')
  } finally { rmSync(cwd, { recursive: true, force: true, maxRetries: 3 }) }
})

test('③ 配置+src 面：不降档，评审照常（fail-closed）', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'tda-'))
  const cn = '2026-09-01-tda-3'
  try {
    setupThinChange(cwd, cn, { extraYaml: 'turbo: docs-auto\n', docsOnly: false })
    const s = doneCmd(cwd, cn, process.env)
    const out = s.stdout + s.stderr
    assert.ok(s.status !== 0, '含代码面不降档——必评面停评审')
    assert.match(out, /独立评审任务书/, '评审照常定档')
    assert.ok(!out.includes('turbo(docs-auto)'), '无降档留痕')
  } finally { rmSync(cwd, { recursive: true, force: true, maxRetries: 3 }) }
})

test('④ 旗标档 reason 原样（用户显式触发）且完成收口', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'tda-'))
  const cn = '2026-09-01-tda-4'
  try {
    setupThinChange(cwd, cn, { flagTurbo: true })
    const s = doneCmd(cwd, cn, process.env)
    const out = s.stdout + s.stderr
    assert.equal(s.status, 0, `旗标档应完成: ${out.split('\n').slice(-8).join(' | ')}`)
    assert.match(out, /极速模式（用户显式触发/, '旗标档 reason 原样')
    assert.ok(!out.includes('turbo(docs-auto)'), '旗标档无 docs-auto 留痕')
    assert.ok(existsSync(join(cwd, '.sillyspec', 'changes', 'archive', cn)), '归档完成')
  } finally { rmSync(cwd, { recursive: true, force: true, maxRetries: 3 }) }
})

test('⑤ unit：readFlowConfig turboDocsAuto 键三态 fail-soft', () => {
  const d = mkdtempSync(join(tmpdir(), 'tda-u-'))
  try {
    mkdirSync(join(d, '.sillyspec'), { recursive: true })
    const specBase = join(d, '.sillyspec')
    const p = join(specBase, 'local.yaml')
    writeFileSync(p, 'project:\n  type: generic\n')
    assert.equal(readFlowConfig(specBase).turboDocsAuto, false, '未配置 false')
    writeFileSync(p, 'project:\n  type: generic\nturbo: docs-auto\n')
    assert.equal(readFlowConfig(specBase).turboDocsAuto, true, 'turbo: docs-auto true')
    writeFileSync(p, 'project:\n  type: generic\nturbo: off\n')
    assert.equal(readFlowConfig(specBase).turboDocsAuto, false, '坏值 fail-soft false')
    rmSync(p, { force: true })
    assert.equal(readFlowConfig(specBase).turboDocsAuto, false, '不可读 fail-soft false')
  } finally { rmSync(d, { recursive: true, force: true, maxRetries: 3 }) }
})
