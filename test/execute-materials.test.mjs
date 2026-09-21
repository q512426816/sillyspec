/**
 * execute 任务材料包单测（2026-09-21-r5-efficiency-batch1 task-02，B-④ / D-003）
 *
 * 背景：execute 实现子代理原被派发通读全量 design 文档（task-08 型轮均 148K vs 同侪
 * 45-92K）。assembleExecuteTaskMaterials 落盘两段式材料包替代之——稳定段（design 契约节
 * 原文摘录 + 签名锚点）先行、专属段（task 卡摘录）在后，稳定前缀跨任务共享兑现统一前缀
 * 缓存收益；上限 24576B 截尾。
 *
 * 锁死契约：
 * 1. 两段顺序：稳定段（design 原文子串）先于专属段（task 卡子串）出现
 * 2. 只摘不译：稳定段与 design.md 对应节逐字一致（逐字符 contains 断言，fixture 原文）
 * 3. 超 24576B：truncated=true、总字节 ≤ 上限、锚点保留、被截节带回源指引行
 * 4. 缺「接口定义」节 → 跳过该节不报错
 * 5. materialsDir 缺省 → 返回 null 不落盘不抛错（additive 零破坏）
 * 6. buildWavePrompt 材料包行：options.materials 有映射渲染「先读材料包/只摘不译」行，
 *    无映射零注入（prompt 与改前字节一致）
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { assembleExecuteTaskMaterials } from '../src/review-material-pack.js'
import { buildWavePrompt } from '../src/stages/execute.js'

let passed = 0
let failed = 0
function assert(cond, msg) {
  if (cond) { console.log(`✅ ${msg}`); passed++ }
  else { console.error(`❌ ${msg}`); failed++ }
}

const CAP = 24576

const API_BODY = '```js\nexport function assembleDemo(a, b) {\n  return a + b\n}\n```'
const LIST_BODY = '| 操作 | 文件路径 | 说明 |\n|---|---|---|\n| 修改 | src/demo.js | 示例改动 |'
const ANCHORS = [{ symbol: 'assembleDemo', file: 'src/demo.js', line: 42 }]

/** 建 fixture change 目录（design.md + tasks/task-03.md）；apiBody=null 表示缺「接口定义」节。 */
function makeChangeDir({ apiBody = API_BODY, listBody = LIST_BODY } = {}) {
  const cd = mkdtempSync(join(tmpdir(), 'exec-mat-'))
  mkdirSync(join(cd, 'tasks'), { recursive: true })
  const designParts = ['# 设计文档', '', '## 背景', '', '背景正文——不应进稳定段。', '']
  if (apiBody !== null) designParts.push('## 接口定义', '', apiBody, '')
  if (listBody !== null) designParts.push('## 文件变更清单', '', listBody, '')
  designParts.push('## 测试与验收', '', '验收正文——不应进稳定段。', '')
  writeFileSync(join(cd, 'design.md'), designParts.join('\n'))
  writeFileSync(join(cd, 'tasks', 'task-03.md'), [
    '---',
    'id: task-03',
    "title: '示例任务：材料包装配'",
    'goal: >',
    '  实现两段式材料包装配，',
    '  稳定段先行。',
    'implementation:',
    '  - 步骤一：新增 assembleExecuteTaskMaterials',
    '  - 步骤二：接入派发引用行',
    'acceptance:',
    '  - 验收一：稳定段与 design 原文逐字一致',
    'allowed_paths:',
    '  - src/review-material-pack.js',
    '  - test/execute-materials.test.mjs',
    '---',
    '',
    '# task-03',
  ].join('\n'))
  return cd
}

// ── 场景 1+2：两段顺序 / 稳定段原文逐字一致 / 锚点与 allowed_paths 在位 ─────────
{
  const cd = makeChangeDir()
  const materialsDir = join(cd, 'materials')
  const r = await assembleExecuteTaskMaterials({ changeDir: cd, taskId: 'task-03', materialsDir, signatureAnchors: ANCHORS })
  assert(r !== null && typeof r.path === 'string', '场景1：返回 {path,…} 落盘结果')
  assert(existsSync(r.path) && r.path === join(materialsDir, 'task-03.md'), '场景1：文件落盘 materialsDir/task-03.md')
  const out = readFileSync(r.path, 'utf8')
  assert(r.truncated === false, '场景1：未超限 truncated=false')
  assert(r.bytes === Buffer.byteLength(out, 'utf8'), '场景1：bytes 与文件字节数一致')

  assert(out.indexOf('## 稳定段') >= 0 && out.indexOf('## 专属段') > out.indexOf('## 稳定段'), '场景1：两段顺序——稳定段标题先于专属段')
  assert(out.indexOf(API_BODY) >= 0 && out.indexOf('示例任务：材料包装配') > out.indexOf(API_BODY), '场景1：稳定段内容先于专属段内容')
  assert(out.indexOf(LIST_BODY) > out.indexOf(API_BODY), '场景1：接口定义在文件变更清单前（节序即优先级序）')

  assert(out.includes(API_BODY), '场景2：接口定义节与 design.md 原文逐字一致（逐字符 contains）')
  assert(out.includes(LIST_BODY), '场景2：文件变更清单节与 design.md 原文逐字一致（逐字符 contains）')
  assert(!out.includes('背景正文') && !out.includes('验收正文'), '场景2：固定节外内容不进稳定段（只摘两节）')

  assert(out.includes('- `assembleDemo` → src/demo.js:42'), '场景1：签名锚点行在位（稳定段）')
  assert(out.includes('示例任务：材料包装配'), '场景1：task 卡 title 摘录在位（专属段）')
  assert(out.includes('步骤一：新增 assembleExecuteTaskMaterials'), '场景1：task 卡 implementation 摘录在位')
  assert(out.includes('验收一：稳定段与 design 原文逐字一致'), '场景1：task 卡 acceptance 摘录在位')
  assert(out.includes('稳定段先行。'), '场景1：task 卡 goal 摘录在位')
  assert(out.includes('- src/review-material-pack.js') && out.includes('- test/execute-materials.test.mjs'), '场景1：allowed_paths 清单在位')
  rmSync(cd, { recursive: true, force: true })
}

// ── 场景 3：超 24576B 截尾——truncated=true / 锚点保留 / 回源行 / 节头+首块保留 ──
{
  const hugeBody = '```js\nexport function hugeDemo() {\n' +
    Array.from({ length: 900 }, (_, i) => `  // 填充行 ${i + 1}：${'X'.repeat(48)}`).join('\n') +
    '\n}\n```'
  const cd = makeChangeDir({ apiBody: hugeBody })
  const r = await assembleExecuteTaskMaterials({ changeDir: cd, taskId: 'task-03', materialsDir: join(cd, 'materials'), signatureAnchors: ANCHORS })
  const out = readFileSync(r.path, 'utf8')
  assert(r.truncated === true, '场景3：超限 truncated=true')
  assert(r.bytes <= CAP && Buffer.byteLength(out, 'utf8') <= CAP, '场景3：截尾后总字节 ≤ 24576')
  assert(r.bytes === Buffer.byteLength(out, 'utf8'), '场景3：bytes 与文件一致')
  assert(out.includes('- `assembleDemo` → src/demo.js:42'), '场景3：锚点永不丢（截尾后仍在位）')
  assert(out.includes(`完整内容回源：${join(cd, 'design.md')}#接口定义`), '场景3：被截节带回源指引行（design.md#接口定义）')
  assert(out.includes('### 接口定义') && out.includes('export function hugeDemo() {'), '场景3：被截节保留节头 + 首个代码块')
  assert(!out.includes('填充行 800'), '场景3：超限正文确已截断')
  assert(out.includes('专属段超限截尾') || out.includes('### 任务卡要点'), '场景3：专属段在剩余预算内（截尾或保头）')
  rmSync(cd, { recursive: true, force: true })
}

// ── 场景 4：缺「接口定义」节 → 跳过不报错 ────────────────────────────────────
{
  const cd = makeChangeDir({ apiBody: null })
  const r = await assembleExecuteTaskMaterials({ changeDir: cd, taskId: 'task-03', materialsDir: join(cd, 'materials') })
  assert(r !== null && r.truncated === false, '场景4：缺节不抛错，正常落盘')
  const out = readFileSync(r.path, 'utf8')
  assert(!out.includes('### 接口定义'), '场景4：缺「接口定义」节 → 稳定段无该节')
  assert(out.includes(LIST_BODY), '场景4：其余节（文件变更清单）照常摘录')
  assert(out.indexOf('## 专属段') > out.indexOf(LIST_BODY), '场景4：两段顺序仍成立')
  rmSync(cd, { recursive: true, force: true })
}

// ── 场景 5：materialsDir 缺省 → 返回 null 不落盘 ─────────────────────────────
{
  const cd = makeChangeDir()
  const r = await assembleExecuteTaskMaterials({ changeDir: cd, taskId: 'task-03', signatureAnchors: ANCHORS })
  assert(r === null, '场景5：materialsDir 缺省返回 null（不落盘不抛错，additive）')
  assert(!existsSync(join(cd, 'materials')), '场景5：未创建落盘目录')
  rmSync(cd, { recursive: true, force: true })
}

// ── 场景 6：buildWavePrompt 材料包行（有 materials 渲染 / 无 materials 零注入）──
const WAVE = { index: 0, tasks: [{ name: 'task-01 测试任务', file: 'tasks/task-01.md' }] }
{
  const cd = makeChangeDir()
  const matPath = join(cd, 'materials', 'task-01.md')
  const wp = buildWavePrompt(WAVE, 1, cd, join(cd, 'wt'), { materials: { 'task-01': matPath } })
  assert(wp.includes('任务材料包'), '场景6a：materials 映射 → 要点含材料包条目')
  assert(wp.includes(matPath), '场景6a：材料包路径行在位')
  assert(wp.includes('先读材料包'), '场景6a：「先读材料包」指引在位')
  assert(wp.includes('按锚点回源核对'), '场景6a：「按锚点回源核对」在位')
  assert(wp.includes('材料包只摘不译，冲突以源文件为准'), '场景6a：「只摘不译，冲突以源文件为准」在位')

  const wpNone = buildWavePrompt(WAVE, 1, cd, join(cd, 'wt'), {})
  assert(!wpNone.includes('任务材料包') && !wpNone.includes('先读材料包'), '场景6b：无 materials → 材料包行零注入')
  assert(wpNone === buildWavePrompt(WAVE, 1, cd, join(cd, 'wt'), undefined), '场景6b：options 缺省与空对象输出逐字节一致')

  // 与全局硬约束并存：gc 恒为第 9 条（既有钉），材料包顺延第 10 条——编号不撞车
  writeFileSync(join(cd, 'plan.md'), '# 计划\n\n## Wave 1\n- task-01\n\n## 全局硬约束（从 design.md 逐字抄录，绑定所有 task）\n- 约束甲：不得新增依赖\n')
  const wpBoth = buildWavePrompt(WAVE, 1, cd, join(cd, 'wt'), { materials: { 'task-01': matPath } })
  assert(wpBoth.includes('9. **全局硬约束'), '场景6c：材料包在场时全局硬约束仍为第 9 条')
  assert(wpBoth.includes('10. **任务材料包'), '场景6c：并存时材料包顺延第 10 条（编号单调）')
  rmSync(cd, { recursive: true, force: true })
}

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
