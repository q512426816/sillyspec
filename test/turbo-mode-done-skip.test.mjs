/**
 * turbo-mode-done-skip.test.mjs — 极速模式 flow done 跳过面（FR-02/D-007，2026-10-14-thin-turbo-mode）
 *
 * 覆盖验收面：
 *   ① turbo 变更 flow done：实测门合成 skipped（gateSummary 带 ⚡极速模式 前缀 + test: skipped
 *      带跳过原因）、评审子步豁免（turboExempt 留痕）、收口 exit 0 归档成功；
 *   ② 升厚即失效（D-007）：tier 改 thick 后重入 done——实测门照跑（无 ⚡ 前缀）、评审不走 turbo 豁免。
 * 夹具配方对齐 flow-protocol.test.mjs。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CLI = join(ROOT, 'src', 'index.js')

function makeRepo() {
  const cwd = mkdtempSync(join(tmpdir(), 'turbo-done-'))
  const run = (args) => execFileSync('git', args, { cwd, stdio: 'pipe' }).toString().trim()
  run(['init', '-q'])
  run(['config', 'user.email', 't@t'])
  run(['config', 'user.name', 't'])
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'project:\n  type: generic\ncommands:\n  test: "node exit0.js"\nflow:\n  mode: thin\n')
  writeFileSync(join(cwd, 'base.txt'), 'base\n')
  run(['add', '.'])
  run(['commit', '-q', '-m', 'base'])
  return { cwd }
}

function cli(cwd, args) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd, encoding: 'utf8', timeout: 180_000,
    env: { ...process.env, SILLYSPEC_WATCHER: '0' },
  })
}

/** v2 槽作答（对齐 flow-protocol fillDesignSlots v2 分支：四问行下补答 + FR 行为句 + 绑定行）。 */
function fillDesignSlots(cwd, change) {
  const base = join(cwd, '.sillyspec', 'changes', change)
  const dp = join(base, 'design.md')
  const rp = join(base, 'requirements.md')
  const dText = readFileSync(dp, 'utf8')
  writeFileSync(dp, dText.replace(/^(本变更怎么解决问题|动了哪些函数|1\. 乱序|2\. 并发写|3\. 切换|4\. 作用域|本方案最大的风险)([^\n]*)$/gm, '$&\n不适用：极速夹具——一行作答即合规'))
  writeFileSync(rp, readFileSync(rp, 'utf8')
    .replace(/^- （待撰写.*$/gm, '- 系统 MUST 达成该条标准行为（极速夹具行为句）')
    .replace(/^FR-\d{2}: （待填.*$/gm, (m) => m.split(':')[0] + ': 不适用：极速夹具——无独立测试面'))
}

function deliverAndClose({ turbo }) {
  const { cwd } = makeRepo()
  const change = '2026-10-14-turbo-done-x'
  const startArgs = ['flow', 'start', '--change', change, '--input', '加一个文件\n成功标准：\n- work.txt 生成', '--autopilot']
  if (turbo) startArgs.push('--turbo')
  const s1 = cli(cwd, startArgs)
  assert.equal(s1.status, 0, `start 失败: ${s1.stdout}\n${s1.stderr}`)
  writeFileSync(join(cwd, 'work.txt'), 'done\n')
  execFileSync('git', ['add', 'work.txt'], { cwd, stdio: 'pipe' })
  execFileSync('git', ['commit', '-q', '-m', 'work (task-01)'], { cwd, stdio: 'pipe' })
  fillDesignSlots(cwd, change)
  return { cwd, change }
}

test('① turbo done：实测门合成 skipped + ⚡极速标注 + 评审豁免，收口归档成功', () => {
  const { cwd, change } = deliverAndClose({ turbo: true })
  const s2 = cli(cwd, ['flow', 'done', '--change', change])
  assert.equal(s2.status, 0, `done 失败: ${s2.stdout}\n${s2.stderr}`)
  assert.match(s2.stdout, /⚡极速模式｜test: skipped — 跳过原因：⚡ 极速模式/, 'gateSummary 极速前缀 + test skipped 带跳过原因')
  assert.match(s2.stdout, /本次收口不含测试客观核验/, '无测试客观核验显式标注（R-03）')
  assert.match(s2.stdout, /⚡ 极速模式：评审子步豁免/, '评审 turboExempt 留痕')
  assert.match(s2.stdout, /⚡ 极速模式：UI 视觉证据探针跳过/, 'ui 探针跳过留痕行（2026-10-14-turbo-guide-tier-copy 评审 P3① 补断言）')
  assert.match(s2.stdout, /flow done 完成（2\/2 协议调用收口）/, '收口成功')
  const arch = join(cwd, '.sillyspec', 'changes', 'archive', change)
  assert.ok(existsSync(join(arch, 'change.patch')) && existsSync(join(arch, 'change-patch.json')), 'patch 冻结件照常留档（D-006 证据非验证）')
  rmSync(cwd, { recursive: true, force: true })
})

test('② 升厚即失效（D-007）：tier=thick 后 turbo 残留不短路——全量仪式恢复（评审照常要求）', () => {
  const { cwd, change } = deliverAndClose({ turbo: true })
  const stPath = join(cwd, '.sillyspec', 'changes', change, 'flow-state.yaml')
  writeFileSync(stPath, readFileSync(stPath, 'utf8').replace(/^tier: thin$/m, 'tier: thick'))
  const s2 = cli(cwd, ['flow', 'done', '--change', change])
  assert.doesNotMatch(s2.stdout, /⚡极速模式｜/, '无极速前缀——实测门恢复全量')
  assert.match(s2.stdout, /test: —｜lint: —/, '实测门真跑（纯文档面走 gate 既有 skip，非 turbo 合成对象）')
  assert.doesNotMatch(s2.stdout, /评审子步豁免（用户显式极速声明/, '评审不走 turbo 豁免分支')
  assert.match(s2.stdout, /本变更需要独立评审/, '厚档评审仪式照常要求（turbo 不豁免）——D-007 生效')
  assert.notEqual(s2.status, 0, '独立评审缺位按厚档语义阻断（turbo 残留不短路）')
  rmSync(cwd, { recursive: true, force: true })
})

test('③ dirty 降 advisory 行为对照（评审 P3① 补断言）：turbo 放行 exit 0，非 turbo 阻断 exit≠0', () => {
  // turbo 侧：未提交交付缺口在场 → 降 advisory 放行（缺口数随收口输出留痕）
  {
    const { cwd, change } = deliverAndClose({ turbo: true })
    writeFileSync(join(cwd, 'dirty.txt'), 'uncommitted\n')
    const s2 = cli(cwd, ['flow', 'done', '--change', change])
    assert.equal(s2.status, 0, `turbo dirty 应放行: ${s2.stdout}\n${s2.stderr}`)
    assert.match(s2.stdout + s2.stderr, /⚡ 极速模式：未提交交付缺口未显式处置——降 advisory 放行/, '降档留痕行在场（console.warn 走 stderr——断言面含 stderr）')
    rmSync(cwd, { recursive: true, force: true })
  }
  // 非 turbo 侧：同场景收口阻断三选一（既有语义零回归）
  {
    const { cwd, change } = deliverAndClose({ turbo: false })
    writeFileSync(join(cwd, 'dirty.txt'), 'uncommitted\n')
    const s2 = cli(cwd, ['flow', 'done', '--change', change])
    assert.notEqual(s2.status, 0, '非 turbo dirty 照常阻断')
    assert.match(s2.stdout + s2.stderr, /未提交交付缺口未显式处置——收口阻断/, '三选一阻断语义不变')
    rmSync(cwd, { recursive: true, force: true })
  }
})
