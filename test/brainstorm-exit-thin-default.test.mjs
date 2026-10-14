/**
 * brainstorm-exit-thin-default.test.mjs — 头脑风暴出口默认收编轻量道
 * （2026-09-29-brainstorm-exit-thin-default）
 *
 * 覆盖验收面：
 *   ① design-init 骨架不预填 scale: large（此前静默厚默认）；留 TODO 位由 Step 8 落值；
 *   ② readDesignScale 三态：`scale: "" # 注释` → null（未标→收编默认）；small/large 正常读取；
 *   ③ Step 8 规模评估与 Step 2 早期筛查指引换轴——复杂度/上下文措辞在场、文件数轴措辞退场、
 *      拿不准默认 small（Step 8）/继续探索（Step 2）。
 *   ④ large 反判据（2026-10-14-scale-large-evidence，deploy-release-notes 镜像误判实证）：
 *      Step 8 large 判据须含反判据（跨多端/多仓不是依据、顺序依赖不是 Wave 证据）、
 *      Wave 证据落 design.md 要求、按定稿重判（不沿用 Step 2 早期印象）；design-init
 *      TODO 注释同口径。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateDesignSkeleton } from '../src/design-facts.js'
import { readDesignScale } from '../src/run/gates.js'
import { getStageSteps } from '../src/run/shared.js'
import { makeRepo, cleanup } from './_complete-step-harness.mjs'

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

function rmQuiet(p) {
  try { rmSync(p, { recursive: true, force: true }) } catch { /* Windows EPERM 可接受 */ }
}

test('① design-init 骨架不预填 large——scale 留 TODO 位由 Step 8 落值', () => {
  const sk = generateDesignSkeleton({ changeName: '2026-09-29-x', author: 't', now: '2026-09-29 12:00:00' })
  assert.ok(!/^scale: large$/m.test(sk), '不再预填 scale: large（静默厚默认摘除）')
  assert.match(sk, /scale: ""/, '留空位＋落值指引注释')
  assert.match(sk, /拿不准 small/, '注释含默认指引')
  assert.match(sk, /跨端\/多仓[^；]*不算|跨端\/多仓.*不是/, 'TODO 注释含反判据口径（2026-10-14-scale-large-evidence）')
})

test('② readDesignScale 三态：空串注释→null；small/large 正常', () => {
  const root = mkdtempSync(join(tmpdir(), 'ss-betd-'))
  const specBase = join(root, '.sillyspec')
  const cd = join(specBase, 'changes', 'c1')
  mkdirSync(cd, { recursive: true })
  const fm = (scale) => writeFileSync(join(cd, 'design.md'), `---\nauthor: t\ncreated_at: 2026-09-29\n${scale}\n---\n# D\n`)
  fm('scale: ""  # TODO：Step 8 落值——单上下文可吞吐=small；拿不准 small')
  assert.equal(readDesignScale(specBase, 'c1'), null, '空串注释 → null（未标→收编默认分支）')
  fm('scale: small')
  assert.equal(readDesignScale(specBase, 'c1'), 'small')
  fm('scale: large  # 注释')
  assert.equal(readDesignScale(specBase, 'c1'), 'large')
  rmQuiet(root)
})

test('③ 指引换轴：Step 8 复杂度措辞＋拿不准默认 small；Step 2 拿不准继续探索；文件数轴退场', async () => {
  const { cwd } = makeRepo('betd-')
  const defs = await getStageSteps('brainstorm', cwd, null)
  const step8 = defs.find((s) => s.name === '生成规范文件')
  const step2 = defs.find((s) => s.name === '加载项目上下文')
  assert.ok(step8 && step2, '两步定义在场')
  assert.match(step8.prompt, /单上下文可吞吐/, 'Step 8 复杂度/上下文轴措辞')
  assert.match(step8.prompt, /拿不准 → small/, 'Step 8 拿不准默认 small')
  assert.ok(!/≤ 2 个文件/.test(step8.prompt), 'Step 8 文件数轴退场')
  assert.match(step8.prompt, /轻量变更收编头脑风暴产物，2 调用收口/, 'small 出口=收编')
  assert.match(step2.prompt, /拿不准 → 继续探索/, 'Step 2 拿不准继续探索（头脑风暴职责）')
  assert.ok(!/≤ 2 个文件/.test(step2.prompt), 'Step 2 文件数轴退场')
  assert.match(step2.prompt, /出口默认收编轻量道/, 'Step 2 点明出口默认')
  rmQuiet(cwd)
})

test('④ large 反判据：跨端/多仓/顺序依赖不算 Wave 证据；判 large 须落 Wave 证据；按定稿重判', async () => {
  const { cwd } = makeRepo('sle-')
  const defs = await getStageSteps('brainstorm', cwd, null)
  const step8 = defs.find((s) => s.name === '生成规范文件')
  const step2 = defs.find((s) => s.name === '加载项目上下文')
  assert.ok(step8 && step2, '两步定义在场')
  // 反判据三条：跨端/多仓不是依据；顺序依赖不是 Wave 证据；Wave 证据=可真并行且单上下文吃不下
  assert.match(step8.prompt, /跨多端\/多仓[^\n]*不是[^\n]*large[^\n]*依据|跨多端\/多仓/, 'Step 8 含跨端/多仓反判据')
  assert.match(step8.prompt, /顺序依赖[^\n]*(不是|不算)[^\n]*Wave|顺序依赖[^\n]*不是/, '顺序依赖不是 Wave 证据')
  assert.match(step8.prompt, /真并行/, 'Wave 证据=可真并行的任务簇')
  // 判 large 须在 design.md 写明 Wave 证据，写不出即 small
  assert.match(step8.prompt, /Wave 证据[^\n]*design\.md|design\.md[^\n]*Wave 证据/, 'Wave 证据落 design.md 要求')
  assert.match(step8.prompt, /写不出[^\n]*small/, '写不出 Wave 证据 = small 兜底')
  // 按定稿重判（不沿用 Step 2 早期筛查印象）
  assert.match(step8.prompt, /定稿[^\n]*重判|重判[^\n]*定稿/, '按定稿方案重判要求')
  assert.match(step8.prompt, /早期筛查印象|早期印象/, '点名不沿用早期印象')
  rmQuiet(cwd)
})

process.on('exit', cleanup)
