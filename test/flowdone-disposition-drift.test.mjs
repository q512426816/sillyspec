/**
 * 2026-10-05-disposition-refreeze-drift 回归：处置重入审计时点漂移检测
 *
 * 背景（主清单 P1，两例实证）：评审发现处置涉及代码修改后重跑 flow done，patch 子步幂等
 * 跳过让 change.patch/review.json 停在处置前时点——2026-10-05-review-promise-negation 处置
 * 提交 905397ef（冻结 patch 查 RISK_ADMITTING_RE 零命中）；2026-10-05-flowdone-lintfail-output
 * 收编复现（评审 P1 处置提交后不带 --refreeze 重跑，归档件缺处置面）。
 *
 * 锁定：
 *   ① detectPatchDrift 归属三形态：本变更后缀触发 / 他侧后缀不触发 / 裸提交不触发
 *   ② e2e 处置重入链路：漂移警告 + 自动重冻结（patch 含处置提交）+ review.json 隔离
 *      （.superseded）+ 重评任务书再现（exit 1 @ review）
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync, readdirSync } from 'node:fs'
import { tmpdir } from 'os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CLI = join(ROOT, 'src', 'index.js')
const { detectPatchDrift } = await import('../src/flow-parity.js')

const tmpRoots = []
function fx() { const d = mkdtempSync(join(tmpdir(), 'drift-')); tmpRoots.push(d); return d }
test.onFinish?.(() => { for (const t of tmpRoots) rmSync(t, { recursive: true, force: true }) })

const CHG = '2026-10-05-drift-x'

function gitRepo(dir) {
  const run = (args) => execFileSync('git', args, { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim()
  run(['init', '-q', '-b', 'main']); run(['config', 'user.email', 't@t']); run(['config', 'user.name', 't'])
  return run
}

test('① detectPatchDrift 归属三形态：本变更后缀触发 / 他侧与裸提交不触发', () => {
  const d = fx()
  const run = gitRepo(d)
  writeFileSync(join(d, 'base.txt'), 'base\n')
  run(['add', '.']); run(['commit', '-q', '-m', 'base'])
  const freezeHead = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: d, encoding: 'utf8' }).trim()
  // 他侧后缀提交（不触发）
  writeFileSync(join(d, 'foreign.txt'), 'f\n')
  run(['add', '.']); run(['commit', '-q', '-m', 'fix: 他侧交付 (2026-10-05-other-change)'])
  // 裸提交（不触发——保守不动作）
  writeFileSync(join(d, 'bare.txt'), 'b\n')
  run(['add', '.']); run(['commit', '-q', '-m', 'chore: 无后缀裸提交'])
  let r = detectPatchDrift({ cwd: d, change: CHG, freezeHead })
  assert.equal(r.drifted, false, `他侧+裸提交不触发（ownCommits=${JSON.stringify(r.ownCommits)}）`)
  // 本变更后缀提交（触发）
  writeFileSync(join(d, 'own.txt'), 'o\n')
  run(['add', '.']); run(['commit', '-q', '-m', `fix: 处置提交 (${CHG}) (task-05)`])
  r = detectPatchDrift({ cwd: d, change: CHG, freezeHead })
  assert.equal(r.drifted, true, '本变更后缀提交触发漂移')
  assert.equal(r.ownCommits.length, 1, '只计本变更后缀提交（他侧/裸不计入）')
  assert.match(r.ownCommits[0], /处置提交/)
  // 冻结锚 == HEAD（无新提交）不触发
  const nowHead = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: d, encoding: 'utf8' }).trim()
  assert.equal(detectPatchDrift({ cwd: d, change: CHG, freezeHead: nowHead }).drifted, false, '锚==HEAD 不触发')
  // 锚缺失（旧冻结件无 head 字段）不触发
  assert.equal(detectPatchDrift({ cwd: d, change: CHG, freezeHead: null }).drifted, false, '无锚不触发（旧件兼容）')
})

test('①b detectPatchDrift 文件面字段：ownFiles / governanceOnly / touchedPromiseFace 三形态', () => {
  const d = fx()
  const run = gitRepo(d)
  writeFileSync(join(d, 'base.txt'), 'base\n')
  run(['add', '.']); run(['commit', '-q', '-m', 'base'])
  const freezeHead = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: d, encoding: 'utf8' }).trim()
  // 治理面提交：只碰 .sillyspec/** 且未触本变更 requirements/design
  mkdirSync(join(d, '.sillyspec', 'changes', CHG), { recursive: true })
  writeFileSync(join(d, '.sillyspec', 'changes', CHG, 'tasks.md'), '# t\n')
  run(['add', '.sillyspec']); run(['commit', '-q', '-m', `docs: 修 P2 措辞 (${CHG})`])
  let r = detectPatchDrift({ cwd: d, change: CHG, freezeHead })
  assert.equal(r.drifted, true, '治理面后缀提交仍触发漂移（触发与豁免两层判定分离）')
  assert.ok(r.ownFiles.includes('.sillyspec/changes/' + CHG + '/tasks.md'), `ownFiles 收治理文件（实际 ${JSON.stringify(r.ownFiles)}）`)
  assert.equal(r.governanceOnly, true, '纯治理提交 → governanceOnly=true')
  assert.equal(r.touchedPromiseFace, false, '未触 requirements/design → touchedPromiseFace=false')
  // 承诺面提交：碰本变更 requirements.md → 治理等价破防
  writeFileSync(join(d, '.sillyspec', 'changes', CHG, 'requirements.md'), '# r\n')
  run(['add', '.sillyspec']); run(['commit', '-q', '-m', `docs: 承诺面 (${CHG})`])
  r = detectPatchDrift({ cwd: d, change: CHG, freezeHead })
  assert.equal(r.governanceOnly, true, '仍全在 .sillyspec/** 下')
  assert.equal(r.touchedPromiseFace, true, '触本变更 requirements.md → touchedPromiseFace=true')
  // 交付面提交：非 .sillyspec 文件 → governanceOnly 破防
  writeFileSync(join(d, 'src.txt'), 's\n')
  run(['add', 'src.txt']); run(['commit', '-q', '-m', `fix: 交付面 (${CHG})`])
  r = detectPatchDrift({ cwd: d, change: CHG, freezeHead })
  assert.equal(r.governanceOnly, false, '窗口内任一交付文件 → governanceOnly=false')
  assert.ok(r.ownFiles.includes('src.txt'), 'ownFiles 含交付文件（正斜杠归一）')
  // 他侧治理提交不进 own 集（字段零污染）
  mkdirSync(join(d, '.sillyspec', 'changes', '2026-10-05-other'), { recursive: true })
  writeFileSync(join(d, '.sillyspec', 'changes', '2026-10-05-other', 'tasks.md'), '# o\n')
  run(['add', '.sillyspec']); run(['commit', '-q', '-m', 'docs: 他侧 (2026-10-05-other)'])
  const r2 = detectPatchDrift({ cwd: d, change: '2026-10-05-other', freezeHead })
  assert.ok(!r2.ownFiles.some((f) => f.includes(CHG)), '他侧变更 own 集不含本变更文件')
})

test('② e2e：处置重入——漂移警告 + 自动重冻结 + review.json 隔离 + 重评任务书再现', () => {
  const cwd = fx()
  const run = gitRepo(cwd)
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'project:\n  type: generic\ncommands:\n  test: "node -e \\"0\\""\n  lint: "node -e \\"0\\""\nflow:\n  mode: thin\n')
  writeFileSync(join(cwd, 'base.txt'), 'base\n')
  run(['add', '.']); run(['commit', '-q', '-m', 'base'])
  const cn = '2026-10-05-drift-e2e'
  const env = { ...process.env, SILLYSPEC_WATCHER: '0' }
  const s1 = spawnSync(process.execPath, [CLI, '--dir', cwd, 'flow', 'start', '--change', cn, '--autopilot', '--input', '漂移检测 e2e\n\n成功标准：\n- 处置重入后审计件含处置面'], { cwd, encoding: 'utf8', timeout: 120_000, env })
  assert.equal(s1.status, 0, `start 失败: ${s1.stderr}`)
  // v2 纯 markdown 填法：design 四问作实质作答（触发评审定档）+ FR 正文成形
  const base = join(cwd, '.sillyspec', 'changes', cn)
  writeFileSync(join(base, 'design.md'), readFileSync(join(base, 'design.md'), 'utf8')
    .replace(/^(本变更怎么解决问题|动了哪些函数|1\. 乱序|2\. 并发写|3\. 切换|4\. 作用域|本方案最大的风险)([^\n]*)$/gm, '$&\ne2e 夹具实质作答：漂移检测链路验证，存在时序窗口（冻结与处置提交之间）。'))
  writeFileSync(join(base, 'requirements.md'), readFileSync(join(base, 'requirements.md'), 'utf8')
    .replace(/^- （待撰写.*$/gm, '- 系统 MUST 在处置重入时重冻结审计件（夹具行为句）')
    .replace(/^FR-\d{2}: （待填.*$/gm, (m) => m.split(':')[0] + ': test/flowdone-disposition-drift.test.mjs「② e2e 处置重入」'))
  // 设计清单声明交付文件（免夹带嫌疑 advisory 噪声干扰）
  writeFileSync(join(base, 'design.md'), readFileSync(join(base, 'design.md'), 'utf8') + '\n## 文件变更清单\n\n| 操作 | 路径 | 说明 |\n|---|---|---|\n| 修改 | src/work.js | 交付 |\n| 修改 | src/work2.js | 处置交付 |\n')
  mkdirSync(join(cwd, 'src'), { recursive: true })
  writeFileSync(join(cwd, 'src', 'work.js'), 'export const a = 1\n')
  run(['add', 'src/work.js']); run(['commit', '-q', '-m', `work (${cn}) (task-01)`])
  // 首轮 done：gate 过 → patch 冻结 → 评审任务书（exit 1）
  const s2 = spawnSync(process.execPath, [CLI, '--dir', cwd, 'flow', 'done', '--change', cn], { cwd, encoding: 'utf8', timeout: 300_000, env })
  const out2 = s2.stdout + s2.stderr
  assert.ok(out2.includes('独立评审任务书'), `首轮应停在评审任务书（实际尾部：${out2.split('\n').slice(-5).join(' | ')}）`)
  assert.ok(existsSync(join(base, 'change-patch.json')), '首轮已冻结 patch')
  const patch1 = readFileSync(join(base, 'change.patch'), 'utf8')
  assert.ok(patch1.includes('+++ b/src/work.js') && !patch1.includes('+++ b/src/work2.js'), '首轮冻结面不含处置文件（按 diff hunk 头判——design 清单字样不算）')
  // 模拟评审 FAIL（P1 发现）——flow done 消费后拦截在 review（不归档，等待处置）
  writeFileSync(join(base, 'review.json'), JSON.stringify({ schemaVersion: 1, change: cn, reviewer: 'subagent', verdict: 'FAIL', findings: [{ severity: 'P1', title: '夹具发现', evidence: 'e2e', location: 'src/work.js:1' }], dimensionNotes: { 乱序: 'finding', 并发: 'ok', 切换: 'ok', 作用域: 'ok' }, reviewedAt: new Date().toISOString() }, null, 2))
  const s3 = spawnSync(process.execPath, [CLI, '--dir', cwd, 'flow', 'done', '--change', cn], { cwd, encoding: 'utf8', timeout: 300_000, env })
  const out3 = s3.stdout + s3.stderr
  assert.ok(out3.includes('独立评审未过'), `第二轮应拦截在评审 FAIL（尾部：${out3.split('\n').slice(-5).join(' | ')}）`)
  assert.ok(s3.status !== 0, 'FAIL 拦截 exit≠0')
  // 处置提交（冻结后新交付）
  writeFileSync(join(cwd, 'src', 'work2.js'), 'export const b = 2\n')
  run(['add', 'src/work2.js']); run(['commit', '-q', '-m', `fix: 评审处置 (${cn}) (task-02)`])
  // 第三轮 done：漂移检测应触发——重冻结 + 隔离 FAIL review.json + 重评任务书再现
  const s4 = spawnSync(process.execPath, [CLI, '--dir', cwd, 'flow', 'done', '--change', cn], { cwd, encoding: 'utf8', timeout: 300_000, env })
  const out4 = s4.stdout + s4.stderr
  assert.ok(out4.includes('审计时点漂移'), `漂移警告在场（尾部：${out4.split('\n').slice(-6).join(' | ')}）`)
  const quarantined = readdirSync(base).find((f) => f.startsWith('review.json.superseded'))
  assert.ok(!!quarantined, `旧 review.json 已隔离（时间戳槽位；目录实况：${readdirSync(base).join(',')}）`)
  assert.ok(!existsSync(join(base, 'review.json')), '隔离后 review.json 不在场（重评入口开）')
  const patch2 = readFileSync(join(base, 'change.patch'), 'utf8')
  assert.ok(patch2.includes('+++ b/src/work2.js'), '重冻结面含处置提交（按 diff hunk 头判）')
  assert.ok(s4.status !== 0, '重评任务书再现（exit 1 @ review）')
  assert.ok(out4.includes('独立评审任务书'), '重评任务书在场')
  // 留痕不自嵌入（2026-10-07-unify-close-trace 增量断言；2026-10-09-close-trace-single-set
  // 后新收口只落 change.patch/change-patch.json 两件，但旧轮冻结件可能仍有 scope-audit.json/
  // patch——排除清单四名全保留，legacy 防护同档）：重冻结时四件同档排除——否则上一轮
  // 冻结件作为 untracked 新文件被全文自嵌入（自引用循环）。
  const meta2 = JSON.parse(readFileSync(join(base, 'change-patch.json'), 'utf8'))
  assert.ok(!meta2.files.some((f) => f.endsWith('scope-audit.json') || f.endsWith('scope-audit.patch')),
    `重冻结 files 面不含快照件（实际 ${meta2.files.filter((f) => f.includes('scope-audit')).join(',')}）`)
  assert.ok(!/^diff --git a\/[^\n]*scope-audit\.(json|patch)/m.test(patch2), '重冻结 patch 无快照件段（自引用防线）')
})

test('③ e2e：治理面等价漂移——评审保留 + 自动重冻结 + 不重评直接归档 + P2/P3 处置提示', () => {
  const cwd = fx()
  const run = gitRepo(cwd)
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'project:\n  type: generic\ncommands:\n  test: "node -e \\"0\\""\n  lint: "node -e \\"0\\""\nflow:\n  mode: thin\n')
  writeFileSync(join(cwd, 'base.txt'), 'base\n')
  run(['add', '.']); run(['commit', '-q', '-m', 'base'])
  const cn = '2026-10-10-drift-gov-e2e'
  const env = { ...process.env, SILLYSPEC_WATCHER: '0' }
  const s1 = spawnSync(process.execPath, [CLI, '--dir', cwd, 'flow', 'start', '--change', cn, '--autopilot', '--input', '治理面等价保留 e2e\n\n成功标准：\n- 评审后治理文件修复不触发重评'], { cwd, encoding: 'utf8', timeout: 120_000, env })
  assert.equal(s1.status, 0, `start 失败: ${s1.stderr}`)
  const base = join(cwd, '.sillyspec', 'changes', cn)
  // v2 纯 markdown 填法（同场景 ②）：design 实质作答触发评审定档 + FR 正文成形 + 清单声明
  writeFileSync(join(base, 'design.md'), readFileSync(join(base, 'design.md'), 'utf8')
    .replace(/^(本变更怎么解决问题|动了哪些函数|1\. 乱序|2\. 并发写|3\. 切换|4\. 作用域|本方案最大的风险)([^\n]*)$/gm, '$&\ne2e 夹具实质作答：治理面等价保留链路验证，存在时序窗口（冻结与治理修复提交之间）。'))
  writeFileSync(join(base, 'requirements.md'), readFileSync(join(base, 'requirements.md'), 'utf8')
    .replace(/^- （待撰写.*$/gm, '- 系统 MUST 在治理面等价漂移时保留评审（夹具行为句）')
    .replace(/^FR-\d{2}: （待填.*$/gm, (m) => m.split(':')[0] + ': test/flowdone-disposition-drift.test.mjs「③ e2e 治理面等价保留」'))
  writeFileSync(join(base, 'design.md'), readFileSync(join(base, 'design.md'), 'utf8') + '\n## 文件变更清单\n\n| 操作 | 路径 | 说明 |\n|---|---|---|\n| 修改 | src/work.js | 交付 |\n')
  mkdirSync(join(cwd, 'src'), { recursive: true })
  writeFileSync(join(cwd, 'src', 'work.js'), 'export const a = 1\n')
  run(['add', 'src/work.js']); run(['commit', '-q', '-m', `work (${cn}) (task-01)`])
  // 首轮 done：gate 过 → patch 冻结 → 评审任务书（exit 1）
  const s2 = spawnSync(process.execPath, [CLI, '--dir', cwd, 'flow', 'done', '--change', cn], { cwd, encoding: 'utf8', timeout: 300_000, env })
  const out2 = s2.stdout + s2.stderr
  assert.ok(out2.includes('独立评审任务书'), `首轮应停在评审任务书（实际尾部：${out2.split('\n').slice(-5).join(' | ')}）`)
  assert.ok(existsSync(join(base, 'change-patch.json')), '首轮已冻结 patch')
  // 评审 PASS 带 1 条 P2（reviewedAgainst 锚冻结时 HEAD——用户循环场景：评审先于治理修复）
  const headAtReview = execFileSync('git', ['rev-parse', 'HEAD'], { cwd, encoding: 'utf8' }).trim()
  writeFileSync(join(base, 'review.json'), JSON.stringify({ schemaVersion: 1, change: cn, reviewer: 'subagent', verdict: 'PASS', reviewedAgainst: headAtReview, findings: [{ severity: 'P2', title: '夹具 P2：tasks 措辞', evidence: 'e2e', location: `${base}/tasks.md:1` }], dimensionNotes: { 乱序: 'ok', 并发: 'ok', 切换: 'ok', 作用域: 'ok' }, reviewedAt: new Date().toISOString() }, null, 2))
  // 治理面修复提交（只碰 .sillyspec/changes/<cn>/tasks.md，带后缀）
  writeFileSync(join(base, 'tasks.md'), readFileSync(join(base, 'tasks.md'), 'utf8') + '\n<!-- 夹具：P2 措辞修复 -->\n')
  run(['add', join('.sillyspec', 'changes', cn, 'tasks.md')]); run(['commit', '-q', '-m', `docs: 修评审 P2 措辞 (${cn}) (task-02)`])
  // 第二轮 done：漂移警告在场，但评审保留不隔离 → 消费 PASS → 不重印任务书 → 直接归档
  const s3 = spawnSync(process.execPath, [CLI, '--dir', cwd, 'flow', 'done', '--change', cn], { cwd, encoding: 'utf8', timeout: 300_000, env })
  const out3 = s3.stdout + s3.stderr
  assert.ok(out3.includes('审计时点漂移'), `漂移警告在场（尾部：${out3.split('\n').slice(-6).join(' | ')}）`)
  assert.ok(/review\.json 保留不隔离|评审对象（交付面）未变/.test(out3), `治理面等价保留说明在场（找「保留不隔离/交付面未变」）`)
  assert.ok(!readdirSync(base).some((f) => f.startsWith('review.json.superseded')), `review.json 未被隔离（目录实况：${readdirSync(base).join(',')}）`)
  assert.ok(!out3.includes('独立评审任务书'), '不重印评审任务书（零重评）')
  assert.ok(out3.includes('非阻断发现'), 'PASS 带 P2 的非阻断发现在场')
  assert.ok(/可留债归档|不触发重评/.test(out3), `P2/P3 处置提示在场（找「可留债归档/不触发重评」）`)
  const patch2 = readFileSync(join(base, 'change.patch'), 'utf8')
  assert.ok(patch2.includes(`+++ b/.sillyspec/changes/${cn}/tasks.md`), '重冻结面含治理修复（按 diff hunk 头判）')
  assert.equal(s3.status, 0, `治理面等价漂移直接归档成功（exit 0；尾部：${out3.split('\n').slice(-5).join(' | ')}）`)
  assert.ok(out3.includes('flow done 完成'), '收口完成（归档注销）')
})
