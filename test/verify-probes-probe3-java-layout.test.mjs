/**
 * 探针 3 Java/JVM 测试布局双向失真（坑 probe3-java-mirror-blind + probe3-testname-false-positive，
 * 2026-09-15 EHS 生产实证）：Maven/Gradle 布局测试在 src/test/<lang> 同包镜像树，与 src/main 侧
 * 永不 co-located——只递归 allowed_paths 目录（全在 main 侧）→ task-02~06 五连假⚠️；反向
 * TestData.java 数据夹具被 /test|spec/i 子串命中 → task-01 假绿「找到 1 个测试文件」。
 *
 * 锁定语义：
 *   - allowed_paths 目录命中 src/main/<lang>/ 时补推 src/test/<lang> 同包镜像根进扫描集（存在才扫）
 *   - isTestFileName 收紧：分隔符分词（foo.test.js / test_utils.py）∪ 裸词（test.js）∪ 驼峰末段
 *     后缀（RpFlowEngineTest/FooIT）——TestData/TestUtil（首段 Test=夹具命名惯势）不命中
 *   - 渲染侧：✅ 行注记 JVM 镜像测试根；⚠️ 行如实说明镜像根已扫仍无测试
 *   - JS co-located 布局零回归（镜像推导不命中 src/main/java 形态）
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { spawnSync } from 'node:child_process'
import {
  runVerifyProbes, renderVerifyProbesReport, isTestFileName, generateVerifyResultSkeleton,
} from '../src/verify-probes.js'

const tmpRoots = []
function mk(prefix) { const d = mkdtempSync(join(tmpdir(), prefix)); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

function git(dir, args) {
  const r = spawnSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`)
  return r.stdout.trim()
}

test('isTestFileName：三路命中收紧——真测试命中、夹具/普通文件不命中', () => {
  const hits = [
    'RpFlowEngineTest.java',        // Java JUnit 惯例：驼峰末段 Test
    'BuildingAreaServiceDiffTest.java',
    'PolluteRpOrderServiceImplTest.java',
    'FooIT.java',                   // 集成测试惯例：末段 IT
    'engine.test.js',               // JS：分隔符分词 test
    'sender.spec.mjs',
    'foo-spec.ts',
    'test_utils.py',                // Python：下划线分词
    'foo_test.rb',
    'test.js',                      // 裸词
    'Test.java',                    // 裸词（大小写归一）
    'Tests.java',
  ]
  for (const n of hits) assert.ok(isTestFileName(n), `应命中：${n}`)
  const misses = [
    'TestData.java',                // EHS 实证假绿源：数据夹具（Test 首段）
    'TestUtil.java',
    'TestMain.java',
    'TestConfig.java',
    'specification.md',             // 子串 spec 的普通文档
    'contest.css',
    'prototyping.js',
    'conftest.py',                  // pytest 夹具配置（非测试文件本体）
    'engine.js',
    'engine.java',
    'App.java',
  ]
  for (const n of misses) assert.ok(!isTestFileName(n), `不应命中：${n}`)
})

test('Java 布局：allowed_paths 全在 src/main/java → 镜像 src/test/java 根命中；TestData 目录不假绿', () => {
  const proj = mk('vp3-java-')
  git(proj, ['init', '-q'])
  git(proj, ['config', 'user.email', 't@t.local'])
  git(proj, ['config', 'user.name', 't'])
  writeFileSync(join(proj, '.gitignore'), '.sillyspec/\n')

  // task-01：service/rp 有镜像测试（EHS task-02 真实形态——旧逻辑此处五连假⚠️）
  mkdirSync(join(proj, 'pollute-service', 'src', 'main', 'java', 'com', 'foo', 'service', 'rp'), { recursive: true })
  writeFileSync(join(proj, 'pollute-service', 'src', 'main', 'java', 'com', 'foo', 'service', 'rp', 'RpFlowEngine.java'), 'class RpFlowEngine {}\n')
  mkdirSync(join(proj, 'pollute-service', 'src', 'test', 'java', 'com', 'foo', 'service', 'rp'), { recursive: true })
  writeFileSync(join(proj, 'pollute-service', 'src', 'test', 'java', 'com', 'foo', 'service', 'rp', 'RpFlowEngineTest.java'), 'class RpFlowEngineTest {}\n')

  // task-02：model 目录镜像根只有 TestData.java 夹具（EHS task-01 假绿形态——旧逻辑误计为测试）
  mkdirSync(join(proj, 'pollute-api', 'src', 'main', 'java', 'com', 'foo', 'model'), { recursive: true })
  writeFileSync(join(proj, 'pollute-api', 'src', 'main', 'java', 'com', 'foo', 'model', 'PolluteRpOrder.java'), 'class PolluteRpOrder {}\n')
  mkdirSync(join(proj, 'pollute-api', 'src', 'test', 'java', 'com', 'foo', 'model'), { recursive: true })
  writeFileSync(join(proj, 'pollute-api', 'src', 'test', 'java', 'com', 'foo', 'model', 'TestData.java'), 'class TestData {}\n')

  // task-03：controller 镜像根不存在（EHS task-03 真实无测试形态——⚠️ 是真信号，须保留）
  mkdirSync(join(proj, 'pollute-service', 'src', 'main', 'java', 'com', 'foo', 'controller'), { recursive: true })
  writeFileSync(join(proj, 'pollute-service', 'src', 'main', 'java', 'com', 'foo', 'controller', 'OrderController.java'), 'class OrderController {}\n')

  git(proj, ['add', '.'])
  git(proj, ['commit', '-q', '-m', 'init'])

  const specBase = join(proj, '.sillyspec')
  const changeDir = join(specBase, 'changes', 'java-layout')
  mkdirSync(join(changeDir, 'tasks'), { recursive: true })
  writeFileSync(join(changeDir, 'tasks.md'), [
    '- [ ] task-01: 状态机\n',
    '- [ ] task-02: 实体\n',
    '- [ ] task-03: 控制器\n',
  ].join(''))
  const card = (id, paths) => writeFileSync(join(changeDir, 'tasks', `${id}.md`),
    `---\nid: ${id}\nallowed_paths:\n${paths.map(p => `  - ${p}`).join('\n')}\n---\n# ${id}\n`)
  card('task-01', ['pollute-service/src/main/java/com/foo/service/rp/RpFlowEngine.java'])
  card('task-02', ['pollute-api/src/main/java/com/foo/model/PolluteRpOrder.java'])
  card('task-03', ['pollute-service/src/main/java/com/foo/controller/OrderController.java'])

  const r = runVerifyProbes({ cwd: proj, changeName: 'java-layout' })
  const t1 = r.probe3.tasks.find(t => t.task === 'task-01')
  const t2 = r.probe3.tasks.find(t => t.task === 'task-02')
  const t3 = r.probe3.tasks.find(t => t.task === 'task-03')

  assert.ok(t1, 'task-01 在探针 3 输出')
  assert.equal(t1.hasTest, true, `镜像 src/test/java 根被探测命中（实际：${JSON.stringify(t1.testFiles)}）——旧逻辑此处假阴`)
  assert.ok(t1.testFiles.some(f => f.includes('RpFlowEngineTest.java')), '命中镜像根内 RpFlowEngineTest')
  assert.ok((t1.mirrorDirs || []).some(d => d.includes('src/test/java')), 'mirrorDirs 登记镜像根')

  assert.ok(t2, 'task-02 在探针 3 输出')
  assert.equal(t2.hasTest, false, '镜像根只有 TestData.java 夹具 → 不计为测试（旧逻辑假绿）')
  assert.ok(!(t2.testFiles || []).some(f => f.includes('TestData.java')), 'TestData.java 不进测试文件清单')

  assert.ok(t3, 'task-03 在探针 3 输出')
  assert.equal(t3.hasTest, false, '镜像根不存在的真无测试形态保持 ⚠️（真信号不掩盖）')

  const md = renderVerifyProbesReport(r)
  assert.match(md, /JVM 镜像测试根/, '渲染注记镜像测试根')
  assert.match(md, /task-01[^\n]*RpFlowEngineTest/, '✅ 行含镜像命中文件')
})

test('JS co-located 布局零回归：无 src/main/java 形态 → 无镜像推导、旧语义不变', () => {
  const proj = mk('vp3-js-')
  git(proj, ['init', '-q'])
  git(proj, ['config', 'user.email', 't@t.local'])
  git(proj, ['config', 'user.name', 't'])
  writeFileSync(join(proj, '.gitignore'), '.sillyspec/\n')
  mkdirSync(join(proj, 'src', 'billing'), { recursive: true })
  writeFileSync(join(proj, 'src', 'billing', 'engine.js'), 'export const e = 1\n')
  writeFileSync(join(proj, 'src', 'billing', 'engine.test.js'), 'test("old", () => {})\n')
  git(proj, ['add', '.'])
  git(proj, ['commit', '-q', '-m', 'init'])

  const specBase = join(proj, '.sillyspec')
  const changeDir = join(specBase, 'changes', 'js-layout')
  mkdirSync(join(changeDir, 'tasks'), { recursive: true })
  writeFileSync(join(changeDir, 'tasks.md'), '- [ ] task-01: 计费\n')
  writeFileSync(join(changeDir, 'tasks', 'task-01.md'),
    '---\nid: task-01\nallowed_paths: [src/billing/engine.js]\n---\n# task-01\n')

  const r = runVerifyProbes({ cwd: proj, changeName: 'js-layout' })
  const t1 = r.probe3.tasks.find(t => t.task === 'task-01')
  assert.equal(t1.hasTest, true, 'co-located engine.test.js 仍命中（零回归）')
  assert.deepEqual(t1.mirrorDirs, [], 'JS 布局无镜像推导')
})

test('骨架层标注 footnote：说明「层」=证据可核验性分层而非执行者声明', () => {
  const R = {
    probe1: { matches: [], globEntries: [], worktreeHits: 0, skippedFiles: [] },
    probe3: { tasks: [], note: 'tasks.md 无 checkbox 任务' },
    probe5: { summary: 'backend 0 端点 / frontend 0 调用' },
    probe6: { unavailable: true, deletions: [], note: 'git 不可用，删除对账跳过' },
  }
  const sk = generateVerifyResultSkeleton(R)
  assert.match(sk, /证据可核验性分层/, '骨架头部含层标注语义 footnote')
  assert.match(sk, /人工判断[^\n]*语义判断[^\n]*(agent|CLI)/, 'footnote 阐明人工判断=agent 填写、CLI 不机械复跑')
  assert.ok(sk.includes('## 结论 [层：人工判断]'), '层标注本身不改名（gate/存量锚定不动）')
})
