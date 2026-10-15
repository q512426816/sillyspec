/**
 * brainstorm-interaction-refine.test.mjs — 头脑风暴交互精化（2026-10-15-brainstorm-interaction-refine）
 *
 * 对照 obra/superpowers v7.0.0 brainstorming 的四处缺口（Playback / builder check /
 * Red Flags / 出口分层）落进 brainstorm 阶段 prompt 后，锁住产出面与交互约束：
 *   FR-01 需求确认清单两态来源标记（用户/推断）＋未确认推断点不得混入已确认清单
 *   FR-02 分块回放（回放块 200-300 字 + 猜测标为猜测 + 「哪里不对或漏了什么」收尾问句）
 *   FR-03 Grill 出口三分（P0 逐轮 / P1/P2 自定并标注 / 只有会改变产物的攒收尾一轮）
 *   FR-04 分段展示设计的「我替你做的决定」节（source≠user）
 *   FR-05 Design Grill 实现者视角四要素（联系不到作者 / 猜错会出事 / 跳过项 / nothing important left）
 *   FR-06 自欺逃逸口对照表三条
 *   FR-07 规模超出当前档位当场说明（不改客观定价）
 *   FR-08 本变更不含 stage-review.js 改动等契约不变面
 *
 * 读法：直接读源文件文本按步骤定义切段断言——**不 import stages/index.js**（其顶层
 * stageRegistry 对本文件 definition 求值，测试入口直 import 触发路径无关的初始化面；
 * FR-05 的 `src/stage-review.js` 断言同属「契约不变」面，读文本即可）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = readFileSync(join(REPO_ROOT, 'src', 'stages', 'brainstorm.js'), 'utf8')

/**
 * 按步骤定义起点（`name: 'X',`）切段：seg('X') 返回从该步定义到下一步定义前的文本。
 * 无侧效应——纯文本读，绕开 stageRegistry 初始化面。
 */
function seg(stepName) {
  const start = SRC.indexOf(`name: '${stepName}',`)
  assert.ok(start >= 0, `步骤「${stepName}」定义在场`)
  const nextIdx = SRC.indexOf("\n      name: '", start + 1)
  return SRC.slice(start, nextIdx === -1 ? SRC.length : nextIdx)
}

/** 段内顺序断言：needles 依序出现（防错步注入与结构漂移）。 */
function assertOrdered(text, needles, label) {
  let cursor = -1
  for (const n of needles) {
    const at = text.indexOf(n)
    assert.ok(at >= 0, `${label}：含「${n}」`)
    assert.ok(at > cursor, `${label}：「${n}」出现在前一项之后`)
    cursor = at
  }
}

const EXPLORE = seg('对话式探索与需求澄清')
const PRESENT = seg('分段展示设计')
const GRILL = seg('Design Grill 交叉审查')

test('FR-01 来源标记两态：确认清单逐条标 [用户]/[推断]，未确认推断点不得混入已确认清单', () => {
  assert.match(EXPLORE, /逐条带来源标记/, '清单要求逐条带来源标记')
  assert.match(EXPLORE, /\[用户\]/, '两态之一：用户原话标记')
  assert.match(EXPLORE, /\[推断\]/, '两态之二：agent 推断标记')
  assert.match(EXPLORE, /不得混入已确认清单/, '未确认推断点不得混入已确认清单')
  assert.match(EXPLORE, /把默认共识伪装成共识/, '既有逃逸口口径保留（不冲销）')
})

test('FR-02 分块回放：200-300 字回放块 + 猜测标为猜测 + 收尾问句 + 剩余输入面不重复回放', () => {
  assert.match(EXPLORE, /分块回放/, 'B2 分块回放节在场')
  assert.match(EXPLORE, /200-300 字/, '回放块量级在场')
  assert.match(EXPLORE, /猜测都标为猜测/, '猜测须标为猜测')
  assert.match(EXPLORE, /哪里不对或漏了什么/, '固定收尾问句在场')
  assert.match(EXPLORE, /不重复回放/, '重入时不重复回放已确认内容（防膨胀）')
  // repeatableWait 语义不变（definition 面）
  assert.match(EXPLORE, /repeatableWait: true/, 'repeatableWait 语义未移除')
})

test('FR-03 Grill 出口三分：P0 逐轮 + P1/P2 自定标注「我的判断」+ 只有会改变产物的攒收尾一轮', () => {
  assert.match(EXPLORE, /P0 逐轮逐问/, 'P0 分层口径在场')
  assert.match(EXPLORE, /只有用户能答且答案会改变产物/, '收尾一轮的准入条件在场')
  assert.match(EXPLORE, /我的判断/, '可自定项标注「我的判断」')
  assert.match(EXPLORE, /一轮\*\*?问题，一次问完/, '一次性问完的口径在场')
  assert.match(EXPLORE, /不再追问、不做第二轮/, '收尾后不再追问（可判定出口）')
})

test('FR-04 我替你做的决定：source≠user 条目逐条展示，且不冲销既有必填项', () => {
  assert.match(PRESENT, /我替你做的决定/, '决策节标题在场')
  assert.match(PRESENT, /source`? 非 user|source≠user/, '取材口径 source≠user 在场')
  assert.match(PRESENT, /Txxx|D-xxx@vN/, '条目引用决策编号')
  // 既有必填项不冲销
  assert.match(PRESENT, /HTML 原型分级/, '原型分级仍在场')
  assert.match(PRESENT, /三选一必填/, '三选一必填仍在场')
})

test('FR-05 实现者视角四要素与三堆分拣：联系不到作者 / 猜错会出事 / 跳过项 / nothing important left', () => {
  assert.match(GRILL, /实现者视角追问/, '实现者视角段在场')
  assert.match(GRILL, /联系不到写文档的人/, '要素①：联系不到文档作者')
  assert.match(GRILL, /猜错会出事/, '要素②：只报猜错会出事的问题')
  assert.match(GRILL, /为什么答案会改变产物/, '要素③：附「为什么答案会改变产物」')
  assert.match(GRILL, /nothing important left/, '要素④：空集出口字面在场')
  assert.match(GRILL, /跳过：文档已显式留给实现者的部分/, '显式跳过项三种在场')
  assert.match(GRILL, /回收分三堆/, '主代理回收后分三堆处理在场')
  assert.match(GRILL, /review\.json 的 \\`reviewerNotes\\` 一节/, '问题清单去向钉在 reviewerNotes')
  assert.match(GRILL, /不新增 schema 字段/, '不新增 review.json schema 字段')
  assert.ok(!SRC.includes("from '../stage-review.js'"), 'brainstorm 不新增 stage-review 依赖（gate 契约不变）')
})

test('FR-06 自欺逃逸口对照表：三条对照逐条在场', () => {
  assert.match(EXPLORE, /自欺逃逸口对照表/, '对照表在场')
  assert.match(EXPLORE, /够清晰了/, '对照一：我觉得已经够清晰了')
  assert.match(EXPLORE, /跳过吧/, '对照二：这步这么简单，跳过吧')
  assert.match(EXPLORE, /听起来不错/, '对照三：用户说听起来不错')
  assert.match(EXPLORE, /不算批准/, '对照三的现实面：没写出来的描述不算批准')
})

test('FR-07 规模重估：超出当前档位当场说明并给升级建议，且不改客观定价', () => {
  assert.match(EXPLORE, /规模重估/, '规模重估约束在场')
  assert.match(EXPLORE, /超出当前档位/, '触发条件：超出当前档位')
  assert.match(EXPLORE, /当场向用户说明并给出升级建议/, '动作：当场说明 + 升级建议')
  assert.match(EXPLORE, /不能自行升降档/, '客观定价不可被 agent 绕过')
})

test('FR-08 契约不变：步骤序列与既有步骤名未改、变更自身零删除面', () => {
  for (const name of ['进度确认', '加载项目上下文', '对话式探索与需求澄清', '提出 2-3 种方案', '分段展示设计', '写设计文档并自审', 'Design Grill 交叉审查', '生成规范文件']) {
    assert.ok(SRC.includes(`name: '${name}',`), `步骤名「${name}」保留`)
  }
  assertOrdered(EXPLORE, ['### B2. 分块回放', '### C. 需求范围评估', '### D. 需求澄清 Grill', '### 自欺逃逸口对照表', '### 输出'], '探索段结构顺序')
})
