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
 *   ④⑤ 2026-10-14-patch-refreeze-missing-artifact：冻结件存在性复查——子步 done 而冻结件
 *      缺席（手工误删/写盘中断）时按漂移同款自动重冻结，不再静默跳过；anchored 评审保留、
 *      未锚定隔离重评
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
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'project:\n  type: generic\ncommands:\n  test: "node exit0.js"\n  lint: "node exit0.js"\nflow:\n  mode: thin\n')
  writeFileSync(join(cwd, 'base.txt'), 'base\n')
  run(['add', '.']); run(['commit', '-q', '-m', 'base'])
  const cn = '2026-10-05-drift-e2e'
  const env = { ...process.env, SILLYSPEC_WATCHER: '0' }
  const s1 = spawnSync(process.execPath, [CLI, '--dir', cwd, 'flow', 'start', '--change', cn, '--autopilot', '--input', '处置漂移检测口径 e2e\n\n成功标准：\n- 处置重入后审计件含处置面'], { cwd, encoding: 'utf8', timeout: 120_000, env })
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
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'project:\n  type: generic\ncommands:\n  test: "node exit0.js"\n  lint: "node exit0.js"\nflow:\n  mode: thin\n')
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
  assert.ok(!out3.includes('独立评审任务书'), '不重印评审任务书（零重评）')
  assert.ok(out3.includes('非阻断发现'), 'PASS 带 P2 的非阻断发现在场')
  assert.ok(/可留债归档|不触发重评/.test(out3), `P2/P3 处置提示在场（找「可留债归档/不触发重评」）`)
  assert.equal(s3.status, 0, `治理面等价漂移直接归档成功（exit 0；尾部：${out3.split('\n').slice(-5).join(' | ')}）`)
  assert.ok(out3.includes('flow done 完成'), '收口完成（归档注销）')
  // 归档后断言（目录已搬 archive/）：保留的 review.json 随归档留档、无隔离件、patch 含治理修复
  const archivedBase = join(cwd, '.sillyspec', 'changes', 'archive', cn)
  assert.ok(existsSync(archivedBase), '变更已归档（目录移入 archive/）')
  assert.ok(!readdirSync(archivedBase).some((f) => f.startsWith('review.json.superseded')), `review.json 未被隔离（归档目录实况：${readdirSync(archivedBase).join(',')}）`)
  assert.ok(existsSync(join(archivedBase, 'review.json')), '保留的 review.json 随归档留档')
  // FR-01 口径同步（2026-10-12-close-trace-freeze-integrity）：治理工件不入冻结面——重冻结
  // patch 只含交付面（src/work.js），治理修复的留档真相=归档目录本体的 tasks.md（文件内容含修复）。
  const patch2 = readFileSync(join(archivedBase, 'change.patch'), 'utf8')
  assert.ok(patch2.includes('+++ b/src/work.js'), '重冻结面含交付面（按 diff hunk 头判）')
  assert.ok(!patch2.includes(`.sillyspec/changes/${cn}/`), '治理工件 hunk 不入冻结面（FR-01：对齐 execute --done 沉淀资产面）')
  assert.ok(readFileSync(join(archivedBase, 'tasks.md'), 'utf8').includes('夹具：P2 措辞修复'), '治理修复随归档目录本体留档')
})

test('④ e2e：冻结件缺失重入——存在性复查触发自动重冻结 + anchored 评审保留 + 直接归档', () => {
  const cwd = fx()
  const run = gitRepo(cwd)
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'project:\n  type: generic\ncommands:\n  test: "node exit0.js"\n  lint: "node exit0.js"\nflow:\n  mode: thin\n')
  writeFileSync(join(cwd, 'base.txt'), 'base\n')
  run(['add', '.']); run(['commit', '-q', '-m', 'base'])
  const cn = '2026-10-14-freeze-missing-e2e'
  const env = { ...process.env, SILLYSPEC_WATCHER: '0' }
  const s1 = spawnSync(process.execPath, [CLI, '--dir', cwd, 'flow', 'start', '--change', cn, '--autopilot', '--input', '冻结件缺失重入 e2e\n\n成功标准：\n- 冻结件被删后重入自动重冻结且评审保留'], { cwd, encoding: 'utf8', timeout: 120_000, env })
  assert.equal(s1.status, 0, `start 失败: ${s1.stderr}`)
  const base = join(cwd, '.sillyspec', 'changes', cn)
  writeFileSync(join(base, 'design.md'), readFileSync(join(base, 'design.md'), 'utf8')
    .replace(/^(本变更怎么解决问题|动了哪些函数|1\. 乱序|2\. 并发写|3\. 切换|4\. 作用域|本方案最大的风险)([^\n]*)$/gm, '$&\ne2e 夹具实质作答：冻结件存在性复查链路验证，存在时序窗口（冻结与冻结件误删之间）。'))
  writeFileSync(join(base, 'requirements.md'), readFileSync(join(base, 'requirements.md'), 'utf8')
    .replace(/^- （待撰写.*$/gm, '- 系统 MUST 在冻结件缺失重入时自动重冻结（夹具行为句）')
    .replace(/^FR-\d{2}: （待填.*$/gm, (m) => m.split(':')[0] + ': test/flowdone-disposition-drift.test.mjs「④ e2e 冻结件缺失重入」'))
  writeFileSync(join(base, 'design.md'), readFileSync(join(base, 'design.md'), 'utf8') + '\n## 文件变更清单\n\n| 操作 | 路径 | 说明 |\n|---|---|---|\n| 修改 | src/work.js | 交付 |\n')
  mkdirSync(join(cwd, 'src'), { recursive: true })
  writeFileSync(join(cwd, 'src', 'work.js'), 'export const a = 1\n')
  run(['add', 'src/work.js']); run(['commit', '-q', '-m', `work (${cn}) (task-01)`])
  // 首轮 done：patch 冻结 → 评审任务书（exit 1）
  const s2 = spawnSync(process.execPath, [CLI, '--dir', cwd, 'flow', 'done', '--change', cn], { cwd, encoding: 'utf8', timeout: 300_000, env })
  const out2 = s2.stdout + s2.stderr
  assert.ok(out2.includes('独立评审任务书'), `首轮应停在评审任务书（实际尾部：${out2.split('\n').slice(-5).join(' | ')}）`)
  assert.ok(existsSync(join(base, 'change-patch.json')), '首轮已冻结 patch')
  // 评审 PASS 锚定当前 HEAD（= 冻结时 HEAD，无后缀提交）
  const headAtReview = execFileSync('git', ['rev-parse', 'HEAD'], { cwd, encoding: 'utf8' }).trim()
  writeFileSync(join(base, 'review.json'), JSON.stringify({ schemaVersion: 1, change: cn, reviewer: 'subagent', verdict: 'PASS', reviewedAgainst: headAtReview, findings: [{ severity: 'P2', title: '夹具 P2', evidence: 'e2e', location: `${base}/tasks.md:1` }], dimensionNotes: { 乱序: 'ok', 并发: 'ok', 切换: 'ok', 作用域: 'ok' }, reviewedAt: new Date().toISOString() }, null, 2))
  // 模拟冻结件缺席（手工误删/写盘中断）——子步状态仍全 done
  rmSync(join(base, 'change.patch'), { force: true })
  rmSync(join(base, 'change-patch.json'), { force: true })
  // 重入：存在性复查应触发「冻结件缺失」+ 自动重冻结 + anchored 评审保留 → 直接归档
  const s3 = spawnSync(process.execPath, [CLI, '--dir', cwd, 'flow', 'done', '--change', cn], { cwd, encoding: 'utf8', timeout: 300_000, env })
  const out3 = s3.stdout + s3.stderr
  assert.ok(out3.includes('冻结件缺失'), `存在性复查告警在场（尾部：${out3.split('\n').slice(-6).join(' | ')}）`)
  assert.ok(!out3.includes('审计时点漂移'), '无漂移警告（缺件 ≠ 漂移，不误报处置漂移）')
  assert.equal(s3.status, 0, `缺件重冻结后直接归档成功（exit 0；尾部：${out3.split('\n').slice(-5).join(' | ')}）`)
  assert.ok(out3.includes('flow done 完成'), '收口完成（归档注销）')
  // 归档目录断言（flow done 成功后变更目录已搬 archive/）：anchored 评审保留不隔离、随归档
  // 留档；两冻结件已重生且含交付面（存在性复查的真实产物，非「无冻结件」空档）。
  const archivedBase = join(cwd, '.sillyspec', 'changes', 'archive', cn)
  assert.ok(existsSync(archivedBase), '变更已归档（目录移入 archive/）')
  assert.ok(!readdirSync(archivedBase).some((f) => f.startsWith('review.json.superseded')), `anchored 评审保留不隔离（归档目录实况：${readdirSync(archivedBase).join(',')}）`)
  assert.ok(existsSync(join(archivedBase, 'review.json')), '保留的评审随归档留档')
  assert.ok(existsSync(join(archivedBase, 'change.patch')), '归档含重生成的 change.patch')
  assert.ok(existsSync(join(archivedBase, 'change-patch.json')), '归档含重生成的 change-patch.json')
  const patch2 = readFileSync(join(archivedBase, 'change.patch'), 'utf8')
  assert.ok(patch2.includes('+++ b/src/work.js'), '重冻结面含交付面（按 diff hunk 头判）')
  const meta2 = JSON.parse(readFileSync(join(archivedBase, 'change-patch.json'), 'utf8'))
  assert.equal(meta2.head, headAtReview, '缺件重冻锚定当前 HEAD')
})

test('⑤ e2e：冻结件缺失 + 评审未锚定——隔离重评（fail-safe 宁可多评）', () => {
  const cwd = fx()
  const run = gitRepo(cwd)
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'project:\n  type: generic\ncommands:\n  test: "node exit0.js"\n  lint: "node exit0.js"\nflow:\n  mode: thin\n')
  writeFileSync(join(cwd, 'base.txt'), 'base\n')
  run(['add', '.']); run(['commit', '-q', '-m', 'base'])
  const baseSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd, encoding: 'utf8' }).trim()
  const cn = '2026-10-14-freeze-missing-stale-e2e'
  const env = { ...process.env, SILLYSPEC_WATCHER: '0' }
  const s1 = spawnSync(process.execPath, [CLI, '--dir', cwd, 'flow', 'start', '--change', cn, '--autopilot', '--input', '冻结件缺失+未锚定评审 e2e\n\n成功标准：\n- 缺基面时未锚定评审隔离重评'], { cwd, encoding: 'utf8', timeout: 120_000, env })
  assert.equal(s1.status, 0, `start 失败: ${s1.stderr}`)
  const base = join(cwd, '.sillyspec', 'changes', cn)
  writeFileSync(join(base, 'design.md'), readFileSync(join(base, 'design.md'), 'utf8')
    .replace(/^(本变更怎么解决问题|动了哪些函数|1\. 乱序|2\. 并发写|3\. 切换|4\. 作用域|本方案最大的风险)([^\n]*)$/gm, '$&\ne2e 夹具实质作答：缺基面 review 处置链路验证，存在时序窗口（冻结与冻结件误删之间）。'))
  writeFileSync(join(base, 'requirements.md'), readFileSync(join(base, 'requirements.md'), 'utf8')
    .replace(/^- （待撰写.*$/gm, '- 系统 MUST 在冻结件缺失且评审未锚定时隔离重评（夹具行为句）')
    .replace(/^FR-\d{2}: （待填.*$/gm, (m) => m.split(':')[0] + ': test/flowdone-disposition-drift.test.mjs「⑤ e2e 缺件+未锚定隔离重评」'))
  writeFileSync(join(base, 'design.md'), readFileSync(join(base, 'design.md'), 'utf8') + '\n## 文件变更清单\n\n| 操作 | 路径 | 说明 |\n|---|---|---|\n| 修改 | src/work.js | 交付 |\n')
  mkdirSync(join(cwd, 'src'), { recursive: true })
  writeFileSync(join(cwd, 'src', 'work.js'), 'export const a = 1\n')
  run(['add', 'src/work.js']); run(['commit', '-q', '-m', `work (${cn}) (task-01)`])
  const s2 = spawnSync(process.execPath, [CLI, '--dir', cwd, 'flow', 'done', '--change', cn], { cwd, encoding: 'utf8', timeout: 300_000, env })
  const out2 = s2.stdout + s2.stderr
  assert.ok(out2.includes('独立评审任务书'), `首轮应停在评审任务书（实际尾部：${out2.split('\n').slice(-5).join(' | ')}）`)
  // 评审 PASS 但 reviewedAgainst 锚在 base 提交（未锚定当前 HEAD——缺基面时无法证明对象一致）
  writeFileSync(join(base, 'review.json'), JSON.stringify({ schemaVersion: 1, change: cn, reviewer: 'subagent', verdict: 'PASS', reviewedAgainst: baseSha, findings: [], dimensionNotes: { 乱序: 'ok', 并发: 'ok', 切换: 'ok', 作用域: 'ok' }, reviewedAt: new Date().toISOString() }, null, 2))
  rmSync(join(base, 'change.patch'), { force: true })
  rmSync(join(base, 'change-patch.json'), { force: true })
  const s3 = spawnSync(process.execPath, [CLI, '--dir', cwd, 'flow', 'done', '--change', cn], { cwd, encoding: 'utf8', timeout: 300_000, env })
  const out3 = s3.stdout + s3.stderr
  assert.ok(out3.includes('冻结件缺失'), `存在性复查告警在场（尾部：${out3.split('\n').slice(-6).join(' | ')}）`)
  const quarantined = readdirSync(base).find((f) => f.startsWith('review.json.superseded'))
  assert.ok(!!quarantined, `未锚定评审已隔离（目录实况：${readdirSync(base).join(',')}）`)
  assert.ok(!existsSync(join(base, 'review.json')), '隔离后 review.json 不在场（重评入口开）')
  assert.ok(existsSync(join(base, 'change.patch')), 'patch 子步已重新冻结（先于 review 重评）')
  assert.ok(out3.includes('独立评审任务书'), '重评任务书再现')
  assert.ok(s3.status !== 0, '重评入口 exit ≠ 0')
})

// ── 2026-10-24-flow-done-review-artifact-drift-loop：交付面锚定（锚后治理件提交不隔离）──
// 坑实证循环：复审锚（reviewedAgainst=修复后 HEAD）→ 提交 review.json → drift 两保留路径
// 双盲（reviewAnchoredToHead 隔着 review.json 提交恒 false；governanceOnly 被窗口内更早的
// 复审已覆盖修复提交拖 false）→ 隔离重评 → 再提交又前移。deliveryFaceAnchoredAfter 把度量
// 单位换成锚点：锚后 own 提交只碰 .sillyspec/** 且未触承诺面 → 交付面未变，结论有效。
const { deliveryFaceAnchoredAfter } = await import('../src/flow-parity.js')

test('⑥ deliveryFaceAnchoredAfter：锚后治理件提交 ok / 锚后交付提交拦 / 触承诺面拦 / 非祖先锚 fail-safe', () => {
  const d = fx()
  const run = gitRepo(d)
  writeFileSync(join(d, 'base.txt'), 'base\n')
  run(['add', '.']); run(['commit', '-q', '-m', 'base'])
  // 复审前的修复提交（交付面——复审 reviewedAgainst 锚在它之后，属已覆盖面）
  mkdirSync(join(d, 'src'), { recursive: true }); writeFileSync(join(d, 'src', 'fix.js'), 'fix\n')
  run(['add', '.']); run(['commit', '-q', '-m', `fix: 评审修复 (${CHG}) (task-01)`])
  const anchor = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: d, encoding: 'utf8' }).trim()
  // 形态 1：锚后 review.json 治理件提交（坑循环形态）→ ok
  mkdirSync(join(d, '.sillyspec', 'changes', CHG), { recursive: true })
  writeFileSync(join(d, '.sillyspec', 'changes', CHG, 'review.json'), '{}\n')
  run(['add', '.']); run(['commit', '-q', '-m', `chore: review (${CHG})`])
  let r = deliveryFaceAnchoredAfter({ cwd: d, change: CHG, anchorSha: anchor })
  assert.equal(r.ok, true, `锚后仅治理件应 ok（files=${JSON.stringify(r.files)}）`)
  assert.equal(r.ownCount, 1)
  // 形态 2：锚后再有交付提交 → 不 ok（评审确实没见过）
  writeFileSync(join(d, 'src', 'late.js'), 'late\n')
  run(['add', '.']); run(['commit', '-q', '-m', `feat: 锚后交付 (${CHG}) (task-02)`])
  r = deliveryFaceAnchoredAfter({ cwd: d, change: CHG, anchorSha: anchor })
  assert.equal(r.ok, false, '锚后交付文件提交必须不 ok（重评正当）')
  // 形态 3：触承诺面（requirements/design）→ 不 ok
  const d2 = fx()
  const run2 = gitRepo(d2)
  writeFileSync(join(d2, 'base.txt'), 'base\n')
  run2(['add', '.']); run2(['commit', '-q', '-m', 'base'])
  const anchor2 = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: d2, encoding: 'utf8' }).trim()
  mkdirSync(join(d2, '.sillyspec', 'changes', CHG), { recursive: true })
  writeFileSync(join(d2, '.sillyspec', 'changes', CHG, 'requirements.md'), 'r\n')
  run2(['add', '.']); run2(['commit', '-q', '-m', `docs: 承诺面后改 (${CHG})`])
  r = deliveryFaceAnchoredAfter({ cwd: d2, change: CHG, anchorSha: anchor2 })
  assert.equal(r.ok, false, '触 requirements（承诺面）必须不 ok')
  assert.equal(r.touchedPromiseFace, true)
  // 形态 4：非祖先锚 / 空锚 → fail-safe false
  assert.equal(deliveryFaceAnchoredAfter({ cwd: d, change: CHG, anchorSha: 'deadbeef' }).ok, false, '非祖先锚 fail-safe')
  assert.equal(deliveryFaceAnchoredAfter({ cwd: d, change: CHG, anchorSha: '' }).ok, false, '空锚 fail-safe')
})

// ── 坑 2026-11-13-flow-done-patch-refreeze-skip-on-rework：token 裸提交归因对齐 ──
// 返工提交常态形态=带 task-NN token 无变更名——旧 detectPatchDrift 只认变更名，token 裸提交
// 不算 own → 漂移不触发 → patch 恒 skip 冻结件停在返工前。归因口径对齐 buildCommitAttribution
// （2026-11-08-bare-commit-attribution-narrow：具名或 token 裸=own，纯裸=非 own）。
test('⑦ token 裸提交（无名有 task-NN）触发漂移；纯裸提交仍不触发；交付面锚定同口径', () => {
  const d = fx()
  const run = gitRepo(d)
  writeFileSync(join(d, 'base.txt'), 'base\n')
  run(['add', '.']); run(['commit', '-q', '-m', 'base'])
  const freezeHead = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: d, encoding: 'utf8' }).trim()
  const anchor = freezeHead
  // token 裸提交（返工常态）：无变更名、有 task-NN
  writeFileSync(join(d, 'rework.js'), 'r\n')
  run(['add', '.']); run(['commit', '-q', '-m', 'fix: 评审返工修复 (task-05)'])
  let r = detectPatchDrift({ cwd: d, change: CHG, freezeHead })
  assert.equal(r.drifted, true, 'token 裸提交应触发漂移（返工后重冻结）')
  assert.ok(r.ownCommits.some(s => s.includes('task-05')), 'ownCommits 含 token 裸提交')
  // 交付面锚定同口径：锚后 token 裸提交触交付文件 → 不 ok（复审未见需重评）
  const dfa = deliveryFaceAnchoredAfter({ cwd: d, change: CHG, anchorSha: anchor })
  assert.equal(dfa.ok, false, '锚后 token 裸交付提交=own → 不 ok')
  // 纯裸提交（无名无 token）保持非 own：不触发漂移
  const d2 = fx()
  const run2 = gitRepo(d2)
  writeFileSync(join(d2, 'base.txt'), 'base\n')
  run2(['add', '.']); run2(['commit', '-q', '-m', 'base'])
  const fh2 = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: d2, encoding: 'utf8' }).trim()
  writeFileSync(join(d2, 'release.txt'), 'v\n')
  run2(['add', '.']); run2(['commit', '-q', '-m', 'chore(release): v1.0.0'])
  const r2 = detectPatchDrift({ cwd: d2, change: CHG, freezeHead: fh2 })
  assert.equal(r2.drifted, false, '纯裸提交（release 形态）仍不触发')
})

// ── 2026-11-24-token-commit-change-dir-attribution：无名 task 提交按触及的变更目录归属 ──
// 坑实证（multi-agent-platform 2026-11-24）：共享仓并行会话都按 task-NN 约定提交，旧口径把
// 「标题含任意 task token」一律算本变更提交——他侧提交触发假的审计时点漂移，冻结补丁由
// 7 文件膨胀到 34 文件（仅 3 个属于该变更），已通过的评审被隔离作废。他侧任务提交随 tick
// 指引同时提交其变更目录下的 tasks.md 与侧车——「触及哪个变更目录」是可用的提交事实。
// 不触及任何变更目录的无名 task 提交（⑦ 的返工形态）仍分不清，维持保守 own。
const OTHER_CHG = '2026-10-05-drift-other'

test('⑧ 他变更的 token 裸提交不触发本变更漂移；触及本变更目录的 token 裸提交触发', () => {
  const d = fx()
  const run = gitRepo(d)
  writeFileSync(join(d, 'base.txt'), 'base\n')
  run(['add', '.']); run(['commit', '-q', '-m', 'base'])
  const freezeHead = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: d, encoding: 'utf8' }).trim()
  // 他会话的任务提交：无变更名、带 task token，随 tick 指引一并提交其变更目录下的 tasks.md
  mkdirSync(join(d, '.sillyspec', 'changes', OTHER_CHG), { recursive: true })
  writeFileSync(join(d, '.sillyspec', 'changes', OTHER_CHG, 'tasks.md'), '# o\n')
  writeFileSync(join(d, 'their.txt'), 't\n')
  run(['add', '.']); run(['commit', '-q', '-m', 'fix: 他侧任务交付 (task-02)'])
  let r = detectPatchDrift({ cwd: d, change: CHG, freezeHead })
  assert.equal(r.drifted, false, `他变更的 token 裸提交不算本变更提交（ownCommits=${JSON.stringify(r.ownCommits)}）`)
  // 同一笔提交对其所属变更仍是 own（不误剔他侧自己的漂移检测）
  r = detectPatchDrift({ cwd: d, change: OTHER_CHG, freezeHead })
  assert.equal(r.drifted, true, '触及本变更目录的 token 裸提交触发漂移')
  assert.ok(r.ownCommits.some((s) => s.includes('task-02')), 'ownCommits 含该提交')
  // 交付面锚定同口径：锚后只有他变更的 token 裸提交 → 本变更评审仍有效
  r = deliveryFaceAnchoredAfter({ cwd: d, change: CHG, anchorSha: freezeHead })
  assert.equal(r.ok, true, `锚后仅他变更 token 裸提交 → 交付面自锚点未变（files=${JSON.stringify(r.files)}）`)
  r = deliveryFaceAnchoredAfter({ cwd: d, change: OTHER_CHG, anchorSha: freezeHead })
  assert.equal(r.ok, false, '对其所属变更：锚后交付提交 → 不 ok')
  // 同时触及本变更目录与他变更目录 → 仍算本变更（保守，own 优先）
  mkdirSync(join(d, '.sillyspec', 'changes', CHG), { recursive: true })
  writeFileSync(join(d, '.sillyspec', 'changes', CHG, 'tasks.md'), '# m\n')
  writeFileSync(join(d, 'both.txt'), 'b\n')
  run(['add', '.']); run(['commit', '-q', '-m', 'fix: 双目录提交 (task-04)'])
  r = detectPatchDrift({ cwd: d, change: CHG, freezeHead })
  assert.equal(r.drifted, true, '同时触及本变更目录的 token 裸提交触发漂移')
  assert.ok(r.ownCommits.some((s) => s.includes('task-04')), 'ownCommits 含双目录提交')
  assert.ok(!r.ownCommits.some((s) => s.includes('task-02')), 'ownCommits 仍不含只触及他变更目录的提交')
  // 触及他变更归档目录的同形态
  const d2 = fx()
  const run2 = gitRepo(d2)
  writeFileSync(join(d2, 'base.txt'), 'base\n')
  run2(['add', '.']); run2(['commit', '-q', '-m', 'base'])
  const fh2 = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: d2, encoding: 'utf8' }).trim()
  mkdirSync(join(d2, '.sillyspec', 'changes', 'archive', OTHER_CHG), { recursive: true })
  writeFileSync(join(d2, '.sillyspec', 'changes', 'archive', OTHER_CHG, 'tasks.md'), '# o\n')
  writeFileSync(join(d2, 'arch.txt'), 'a\n')
  run2(['add', '.']); run2(['commit', '-q', '-m', 'docs: 归档补记 (task-03)'])
  assert.equal(detectPatchDrift({ cwd: d2, change: CHG, freezeHead: fh2 }).drifted, false, '触及他变更归档目录的 token 裸提交不算本变更')
  // 自定义变更根（spec 目录不在缺省位置）：同规则按传入前缀判定
  const d3 = fx()
  const run3 = gitRepo(d3)
  writeFileSync(join(d3, 'base.txt'), 'base\n')
  run3(['add', '.']); run3(['commit', '-q', '-m', 'base'])
  const fh3 = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: d3, encoding: 'utf8' }).trim()
  mkdirSync(join(d3, 'docs', 'spec', 'changes', OTHER_CHG), { recursive: true })
  writeFileSync(join(d3, 'docs', 'spec', 'changes', OTHER_CHG, 'tasks.md'), '# o\n')
  writeFileSync(join(d3, 'theirs3.txt'), 't\n')
  run3(['add', '.']); run3(['commit', '-q', '-m', 'fix: 他侧任务交付 (task-01)'])
  assert.equal(detectPatchDrift({ cwd: d3, change: CHG, freezeHead: fh3, changesDirPrefix: 'docs/spec/changes/' }).drifted, false, '自定义变更根：他变更目录提交不算本变更')
  // 空串=禁用目录归属 → 退回保守（无名 task 提交算本变更）
  assert.equal(detectPatchDrift({ cwd: d3, change: CHG, freezeHead: fh3, changesDirPrefix: '' }).drifted, true, '目录归属禁用时维持保守 own')
})

// ── 2026-11-24-token-commit-change-dir-attribution：并行会话端到端 ──
// multi-agent-platform 2026-11-24 实证路径：评审 PASS 后别的会话提交了几笔任务交付（标题只带
// task token、随 tick 指引同提交其变更目录），重跑 flow done 把它们误判为本变更提交——报
// 「审计时点漂移」、隔离刚通过的评审、把冻结补丁由 7 文件重冻成 34 文件（仅 3 个属于该变更）。
test('⑨ e2e：评审 PASS 后他变更 token 裸提交落地——不漂移不隔离，补丁不含他侧文件', () => {
  const cwd = fx()
  const run = gitRepo(cwd)
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'project:\n  type: generic\ncommands:\n  test: "node exit0.js"\n  lint: "node exit0.js"\nflow:\n  mode: thin\n')
  writeFileSync(join(cwd, 'base.txt'), 'base\n')
  run(['add', '.']); run(['commit', '-q', '-m', 'base'])
  const cn = '2026-11-24-par-e2e'
  const other = '2026-11-24-par-other'
  const env = { ...process.env, SILLYSPEC_WATCHER: '0' }
  const s1 = spawnSync(process.execPath, [CLI, '--dir', cwd, 'flow', 'start', '--change', cn, '--autopilot', '--input', '并行会话漂移端到端链路验证\n\n成功标准：\n- 他变更的任务提交不触发本变更漂移'], { cwd, encoding: 'utf8', timeout: 120_000, env })
  assert.equal(s1.status, 0, `start 失败: ${s1.stderr}`)
  const base = join(cwd, '.sillyspec', 'changes', cn)
  writeFileSync(join(base, 'design.md'), readFileSync(join(base, 'design.md'), 'utf8')
    .replace(/^(本变更怎么解决问题|动了哪些函数|1\. 乱序|2\. 并发写|3\. 切换|4\. 作用域|本方案最大的风险)([^\n]*)$/gm, '$&\ne2e 夹具实质作答：并行会话漂移链路验证，存在时序窗口（评审与他侧提交之间）。'))
  writeFileSync(join(base, 'requirements.md'), readFileSync(join(base, 'requirements.md'), 'utf8')
    .replace(/^- （待撰写.*$/gm, '- 系统 MUST 在他变更的任务提交落地后不误判漂移（夹具行为句')
    .replace(/^FR-\d{2}: （待填.*$/gm, (m) => m.split(':')[0] + ': test/flowdone-disposition-drift.test.mjs「⑨ e2e：评审 PASS 后他变更 token 裸提交落地」'))
  writeFileSync(join(base, 'design.md'), readFileSync(join(base, 'design.md'), 'utf8') + '\n## 文件变更清单\n\n| 操作 | 路径 | 说明 |\n|---|---|---|\n| 修改 | src/work.js | 交付 |\n')
  mkdirSync(join(cwd, 'src'), { recursive: true })
  writeFileSync(join(cwd, 'src', 'work.js'), 'export const a = 1\n')
  run(['add', 'src/work.js']); run(['commit', '-q', '-m', `work (${cn}) (task-01)`])
  // 首轮 done：patch 冻结 → 评审任务书（exit 1）
  const s2 = spawnSync(process.execPath, [CLI, '--dir', cwd, 'flow', 'done', '--change', cn], { cwd, encoding: 'utf8', timeout: 300_000, env })
  const out2 = s2.stdout + s2.stderr
  assert.ok(out2.includes('独立评审任务书'), `首轮应停在评审任务书（实际尾部：${out2.split('\n').slice(-5).join(' | ')}）`)
  assert.ok(existsSync(join(base, 'change-patch.json')), '首轮已冻结 patch')
  // 评审 PASS 锚定当前 HEAD
  const headAtReview = execFileSync('git', ['rev-parse', 'HEAD'], { cwd, encoding: 'utf8' }).trim()
  writeFileSync(join(base, 'review.json'), JSON.stringify({ schemaVersion: 1, change: cn, reviewer: 'subagent', verdict: 'PASS', reviewedAgainst: headAtReview, findings: [], dimensionNotes: { 乱序: 'ok', 并发: 'ok', 切换: 'ok', 作用域: 'ok' }, reviewedAt: new Date().toISOString() }, null, 2))
  // 他会话的任务提交落地：无变更名、带 task token，随 tick 指引同提交其变更目录下的 tasks.md 与侧车
  mkdirSync(join(cwd, '.sillyspec', 'changes', other), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'changes', other, 'tasks.md'), '# o\n')
  writeFileSync(join(cwd, '.sillyspec', 'changes', other, 'task-ticks.jsonl'), '{"task":"task-02"}\n')
  writeFileSync(join(cwd, 'src', 'theirs.js'), 'export const t = 2\n')
  run(['add', join('.sillyspec', 'changes', other), 'src/theirs.js']); run(['commit', '-q', '-m', 'fix: 他侧任务交付 (task-02)'])
  // 重跑：不报漂移、不隔离评审、直接归档
  const s3 = spawnSync(process.execPath, [CLI, '--dir', cwd, 'flow', 'done', '--change', cn], { cwd, encoding: 'utf8', timeout: 300_000, env })
  const out3 = s3.stdout + s3.stderr
  assert.ok(!out3.includes('审计时点漂移'), `他变更的任务提交不得触发本变更漂移（尾部：${out3.split('\n').slice(-6).join(' | ')}）`)
  assert.ok(!out3.includes('归属分不清'), '窗口内没有分不清形态的提交 → 不输出归属分不清提示')
  assert.ok(!out3.includes('独立评审任务书'), '不重印评审任务书（评审未被隔离）')
  assert.equal(s3.status, 0, `直接归档成功（exit 0；尾部：${out3.split('\n').slice(-5).join(' | ')}）`)
  assert.ok(out3.includes('flow done 完成'), '收口完成（归档注销）')
  const archivedBase = join(cwd, '.sillyspec', 'changes', 'archive', cn)
  assert.ok(existsSync(archivedBase), '变更已归档（目录移入 archive/）')
  assert.ok(!readdirSync(archivedBase).some((f) => f.startsWith('review.json.superseded')), `评审未被隔离（归档目录实况：${readdirSync(archivedBase).join(',')}）`)
  assert.ok(existsSync(join(archivedBase, 'review.json')), '评审随归档留档')
  const patch = readFileSync(join(archivedBase, 'change.patch'), 'utf8')
  assert.ok(patch.includes('+++ b/src/work.js'), '补丁含本变更交付面（按 diff hunk 头判）')
  assert.ok(!patch.includes('+++ b/src/theirs.js'), '补丁不含他变更任务提交的文件')
})

// ── FR-06：「分不清」形态点名（advisory） ──
// 无名、带 task token、不触及任何变更目录的提交分不清是谁的，维持保守 own（漂移与评审处置
// 不变）；收口必须点名这类提交，让误判可见、可追（落地验证：平台仓最近 300 笔提交中 29 笔）。
test('⑩ e2e：分不清的无名 task 提交——漂移与隔离照旧，并点名提示（advisory）', () => {
  const cwd = fx()
  const run = gitRepo(cwd)
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'project:\n  type: generic\ncommands:\n  test: "node exit0.js"\n  lint: "node exit0.js"\nflow:\n  mode: thin\n')
  writeFileSync(join(cwd, 'base.txt'), 'base\n')
  run(['add', '.']); run(['commit', '-q', '-m', 'base'])
  const cn = '2026-11-24-amb-e2e'
  const env = { ...process.env, SILLYSPEC_WATCHER: '0' }
  const s1 = spawnSync(process.execPath, [CLI, '--dir', cwd, 'flow', 'start', '--change', cn, '--autopilot', '--input', '分不清形态点名提示端到端\n\n成功标准：\n- 分不清的提交被点名且判定不变'], { cwd, encoding: 'utf8', timeout: 120_000, env })
  assert.equal(s1.status, 0, `start 失败: ${s1.stderr}`)
  const base = join(cwd, '.sillyspec', 'changes', cn)
  writeFileSync(join(base, 'design.md'), readFileSync(join(base, 'design.md'), 'utf8')
    .replace(/^(本变更怎么解决问题|动了哪些函数|1\. 乱序|2\. 并发写|3\. 切换|4\. 作用域|本方案最大的风险)([^\n]*)$/gm, '$&\ne2e 夹具实质作答：分不清形态点名链路验证，存在时序窗口（评审与分不清提交之间）。'))
  writeFileSync(join(base, 'requirements.md'), readFileSync(join(base, 'requirements.md'), 'utf8')
    .replace(/^- （待撰写.*$/gm, '- 系统 MUST 点名分不清形态的无名 task 提交且不改变判定（夹具行为句')
    .replace(/^FR-\d{2}: （待填.*$/gm, (m) => m.split(':')[0] + ': test/flowdone-disposition-drift.test.mjs「⑩ e2e：分不清的无名 task 提交——漂移与隔离照旧，并点名提示」'))
  writeFileSync(join(base, 'design.md'), readFileSync(join(base, 'design.md'), 'utf8') + '\n## 文件变更清单\n\n| 操作 | 路径 | 说明 |\n|---|---|---|\n| 修改 | src/work.js | 交付 |\n')
  mkdirSync(join(cwd, 'src'), { recursive: true })
  writeFileSync(join(cwd, 'src', 'work.js'), 'export const a = 1\n')
  run(['add', 'src/work.js']); run(['commit', '-q', '-m', `work (${cn}) (task-01)`])
  const s2 = spawnSync(process.execPath, [CLI, '--dir', cwd, 'flow', 'done', '--change', cn], { cwd, encoding: 'utf8', timeout: 300_000, env })
  const out2 = s2.stdout + s2.stderr
  assert.ok(out2.includes('独立评审任务书'), `首轮应停在评审任务书（实际尾部：${out2.split('\n').slice(-5).join(' | ')}）`)
  const headAtReview = execFileSync('git', ['rev-parse', 'HEAD'], { cwd, encoding: 'utf8' }).trim()
  writeFileSync(join(base, 'review.json'), JSON.stringify({ schemaVersion: 1, change: cn, reviewer: 'subagent', verdict: 'PASS', reviewedAgainst: headAtReview, findings: [], dimensionNotes: { 乱序: 'ok', 并发: 'ok', 切换: 'ok', 作用域: 'ok' }, reviewedAt: new Date().toISOString() }, null, 2))
  // 他会话的无目录 task 提交：无名、带 task token、不触及任何变更目录 → 分不清，保守按本变更处理
  writeFileSync(join(cwd, 'src', 'theirs-amb.js'), 'export const u = 3\n')
  run(['add', 'src/theirs-amb.js']); run(['commit', '-q', '-m', 'fix: 他侧无目录提交 (task-07)'])
  const s3 = spawnSync(process.execPath, [CLI, '--dir', cwd, 'flow', 'done', '--change', cn], { cwd, encoding: 'utf8', timeout: 300_000, env })
  const out3 = s3.stdout + s3.stderr
  // 判定不变：仍触发漂移、评审仍被隔离、重发评审任务书
  assert.ok(out3.includes('审计时点漂移'), '分不清形态维持保守 own：仍触发漂移（判定不变）')
  assert.ok(readdirSync(base).some((f) => f.startsWith('review.json.superseded')), `评审处置不变：被隔离（目录实况：${readdirSync(base).join(',')}）`)
  assert.ok(out3.includes('独立评审任务书'), '评审处置不变：重发评审任务书')
  assert.notEqual(s3.status, 0, '停在重评（exit ≠ 0）')
  // 点名提示：漂移分支与冻结面两处都在，且点名该提交
  assert.match(out3, /归属分不清·advisory/, '点名提示在场')
  assert.match(out3, /他侧无目录提交 \(task-07\)/, '提示点名该提交（标题）')
  assert.match(out3, /请其提交标题带上变更名/, '提示给出处置办法')
})
