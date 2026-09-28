/**
 * brainstorm-exit-thin-default.test.mjs — 头脑风暴出口默认收编轻量道
 * （2026-09-29-brainstorm-exit-thin-default）
 *
 * 覆盖验收面：
 *   ① design-init 骨架不预填 scale: large（此前静默厚默认）；留 TODO 位由 Step 8 落值；
 *   ② readDesignScale 三态：`scale: "" # 注释` → null（未标→收编默认）；small/large 正常读取；
 *   ③ Step 8 规模评估与 Step 2 早期筛查指引换轴——复杂度/上下文措辞在场、文件数轴措辞退场、
 *      拿不准默认 small（Step 8）/继续探索（Step 2）。
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

process.on('exit', cleanup)
