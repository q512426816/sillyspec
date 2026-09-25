/**
 * stage-templates.js — 阶段产物模板出上下文（R16 减负批次，2026-09-24）
 *
 * 背景：brainstorm「生成规范文件」步内嵌 proposal/requirements/tasks/decisions 四份完整落盘
 * 模板（~100 行）——说明书每轮全量回放（R15 实测 burst 单次载荷 1581 行/45K token，59 轮
 * brainstorm 等于把说明书交了 59 遍钱），而模板只在真写产物的轮才需要。M1 指纹缓存只省
 * 「复入重发」不省「每轮回放」，模板出上下文是唯一能把回放面砍掉的手段。
 *
 * 机制：模板单一源在本文件 → materializeStageTemplates 在 outputStep 渲染期幂等落盘
 * `<specBase>/.runtime/templates/<name>.md` → 步骤 prompt 只留要点 + 文件路径 +「写该产物前
 * Read 一次」。产物格式漂移由 --done 门禁兜底（brainstorm.design.* / four-piece 规则逐条
 * 点名——模板没读会撞门禁，重读即修复，闭环在既有机制上）。
 *
 * 只收纯格式骨架；行为纪律（NEW: 前缀铁律/数据流标注/FR 承接纪律等）留在 prompt——规则
 * 是判断依据须常驻，模板是抄写目标按需读。
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

/** brainstorm 四件套产物格式模板（自 stages/brainstorm.js「生成规范文件」步逐字迁移——
 *  与 prompt 指针版本同源；decisions 九字段与可选字段说明一并迁入）。 */
export const BRAINSTORM_ARTIFACT_TEMPLATES_MD = `# brainstorm 规范文件产物模板（proposal / requirements / tasks / decisions）

> 写对应产物前读本文件一次，严格按模板结构与 frontmatter 产出；缺章节/缺 frontmatter 会被
> 「生成规范文件」步 --done 门禁逐条点名（brainstorm.design.* / four-piece 规则）。

## proposal.md 格式要求
\`\`\`markdown
---
author: <git-user>
created_at: <now-datetime>
---
# 提案书（Proposal）

## 动机
为什么做、解决什么核心问题

## 关键问题
为什么现有方案不够（展开 2-3 个具体痛点）

## 变更范围
本次做什么

## 不在范围内（显式清单）
- 不做 X
- 不做 Y

## 成功标准（可验证）
- 旧配置默认行为不变
- 新功能在配置后可用
- ...
\`\`\`

## requirements.md 格式要求
\`\`\`markdown
---
author: <git-user>
created_at: <now-datetime>
---
# 需求规格（Requirements）

## 角色
| 角色 | 说明 |
|---|---|
| 开发者 | ... |

## 功能需求

### FR-01: 需求名称
覆盖决策：D-001@v1, D-002@v1（如适用）
承接: FR-<域>-NNN（如适用——改写/取代注入清单中的已有行为时必填，全新行为省略本行）
Given 前提条件
When 触发动作
Then 期望结果

（每个边界条件独立 GWT 块；场景名行 \`#### 场景：X\` 会被归档索引用作摘要，建议保留）
（约束强度标注——RFC 2119 约定：FR 正文与非功能需求里的约束必须用固定词标硬度：MUST/必须=硬性要求（违反即缺陷）；MUST NOT/禁止=红线（绝对不允许，如「平台 MUST NOT 基于 provisional 事件内容做流程判定」）；SHOULD/应当=强烈建议（偏离须注明理由）；MAY/可以=可选。禁止裸写无强度词的约束句（「不做 X」读不出是描述还是禁令）。fr/ 归档索引逐字透传，强度词随知识注入带给后续变更——这是规范语言的全链路载体）

## 非功能需求
- 兼容性：...
- 可回退：...
- 可测试：...

## 决策覆盖矩阵（如存在 decisions.md）
| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001@v1 | FR-01 | ... |
\`\`\`

## tasks.md 格式要求（scale=large 时生成骨架；任务清单唯一真相——plan 阶段展开细节并写回本文件）
\`\`\`markdown
---
author: <git-user>
created_at: <now-datetime>
---
# 任务清单（Tasks）

- [ ] task-01: <任务名>
- [ ] task-02: <任务名>
\`\`\`
> 骨架只列任务名。plan 阶段会把展开后的清单**写回本文件**（checkbox 行带一句话名，可附 [model:xxx]/(depends_on: …) 标注；保留 frontmatter/标题/ql-xxx 等非 task-XX 行）；execute 勾选与 verify 对照都在本文件。

## decisions.md 格式要求（前序步骤已增量创建时对账即可；无决策的变更不生成）
\`\`\`markdown
---
author: <git-user>
created_at: <now-datetime>
---

# 决策记录（Decisions）

## D-001@v1: 决策短标题
- type: definition | consistency | feasibility | term | boundary | premise | architecture | compatibility | risk
- priority: P0 | P1 | P2
- status: accepted | unresolved | rejected | superseded
- supersedes:
- source: user | code | docs
- question: 被解决的问题
- answer: 用户确认或代码查证结果
- normalized_requirement: 可测试的约束
- impacts: [FR-01, task-01, verify-01]
- evidence: 用户回答轮次或代码/文档路径
\`\`\`

> 可选字段（按需另加，旧格式决策缺这些字段不受影响）：**锚点**（决策落点主文件，\`<src 路径>:<行号或符号>\`；status=confirmed 时必填）；**模块域**（决策涉及的模块 ID，可多个逗号分隔——合法 id 只取**当前变更所属项目**的 \`{SPEC_ROOT}/docs/<project>/modules/_module-map.yaml\`，多项目仓勿读其他子项目的 map（核验不认，报错会点名归属）；规划中的新模块用 \`NEW:<名>\` 前缀声明，冒号后不加空格：\`NEW:foo\` 合法、\`NEW: foo\` 属书写错误。「生成规范文件」步 --done 的模块域核验对不认识的 id 直接阻断）；**否决理由**（status=rejected 时必填）；**复潮条件**（status=rejected 时必填）；**故障面**（本决策引入的新失败模式——新机制落地时留痕它引入什么失败模式；type=architecture 时建议填写，可选）；**退役判据**（出现什么信号时简化或删除本机制——信号出现就该简化它；type=architecture 时建议填写，可选）。
`

/** 模板清单（name → 内容）。新模板入册即自动被 materialize 落盘。 */
const STAGE_TEMPLATE_FILES = {
  'brainstorm-artifact-templates.md': BRAINSTORM_ARTIFACT_TEMPLATES_MD,
}

/**
 * 幂等落盘全部阶段模板到 `<specBase>/.runtime/templates/`（内容有变才写，原子性靠短文件
 * best-effort——模板只读消费，半写窗口下一次渲染会补齐）。
 * @returns {string|null} 模板目录绝对路径（异常 → null，调用方 fail-soft）
 */
export function materializeStageTemplates(specBase) {
  try {
    if (!specBase) return null
    // 只在已存在的 specBase 内落盘（坑：凭空新建 <cwd>/.sillyspec 会污染 spec-dir 向上
    // 搜索语义——渲染测试曾在 test/ 目录下落出 test/.sillyspec，spec-dir-home-guard 向上
    // 命中即断言失败）。specBase 不存在 = 本目录不是变更根，零动作。
    if (!existsSync(specBase)) return null
    const dir = join(specBase, '.runtime', 'templates')
    mkdirSync(dir, { recursive: true })
    for (const [name, content] of Object.entries(STAGE_TEMPLATE_FILES)) {
      const p = join(dir, name)
      let cur = null
      try { cur = readFileSync(p, 'utf8') } catch { /* 首次 */ }
      if (cur !== content) writeFileSync(p, content, 'utf8')
    }
    return dir
  } catch {
    return null
  }
}
