---
author: flow-machine-draft
created_at: 2026-10-15T08:31:00.324Z
---
# 设计记录（Design Record）— 2026-10-15-brainstorm-interaction-refine

## 做法概述

本变更**只改 prompt 文本与产出要求**，不新增步骤、不动状态机、不改 CLI 校验逻辑。落点集中在 `src/stages/brainstorm.js` 的四步定义与阶段定义：

1. **对话式探索与需求澄清**步（FR-01/02/03/07）：输出要求加来源标记两态；B 节加"分块回放"交互形态；D 节 Grill 出口改三分（P0 逐轮 / P1/P2 自定并标注 / 只有会改变产物的攒一轮）；该步的"正常完成"逃逸口与来源标记挂钩；规模重估约束条。
2. **分段展示设计**步（FR-04）：输出要求加「我替你做的决定」节（source≠user 条目）。
3. **Design Grill 交叉审查**步（FR-05）：子代理派发 prompt 补实现者视角四要素；主代理回收动作补三堆分拣与一轮问完；问题清单去向钉在 `review.json` 的 `reviewerNotes`（既有契约字段）。
4. 该阶段自欺逃逸口对照表（FR-06）落在「对话式探索与需求澄清」步尾部（三条对照全部指向该步/案选择步的逃逸口），不新建阶段级说明文件——避免与既有铁律段重复表述。

对照来源：obra/superpowers v7.0.0 `skills/brainstorming/SKILL.md`（Playback / builder-check / Red Flags）与 `builder-check-prompt.md`。选这个方案的理由：四处缺口全部是"交互节奏与产出契约"层面的，机械校验面（review.json、Stage Review Gate、决策落盘 API）已经足够承载，加文本是成本最低且可回退的形态；任何新增校验都会引入新的逃逸口与合规负担。

## 接口契约

- **无新增函数、无新增 CLI 命令、无文件格式变更**。`src/stages/brainstorm.js` 的 `definition.steps[].prompt` 字符串内容变化是本次唯一对外可见面——所有消费方（`getStageSteps`、`renderPrompt` 占位符替换、Stage Review Gate 的阶段清单）读到的仍是同一批步骤名与同一批占位符。
- **步骤名与顺序不变**：`进度确认 / 加载项目上下文 / 对话式探索与需求澄清 / 提出 2-3 种方案 / 分段展示设计 / 写设计文档并自审 / Design Grill 交叉审查 / 生成规范文件`。步骤名是存量进度库的匹配键（见该文件 `migratedFrom` 注释），改名会触发迁移逻辑风险。
- **`repeatableWait` / `maxWaitRounds: 8` / `waitOptions` 保持不变**（FR-02 明确要求）。`waitOptions` 文案不改，避免存量会话恢复时选项不匹配。
- **`review.json` schema 不变**：builder 问题清单写入既有 `reviewerNotes` 字段，`src/stage-review.js` 零改动（FR-05 场景「gate 契约不变」）。
- 新增一个测试文件 `test/brainstorm-interaction-refine.test.mjs`（对 `getStageSteps('brainstorm', ...)` 返回的 prompt 做字面断言）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. **乱序/迟到到达**：本变更无新输入面。用户的回答仍走 `--continue --answer` 单通道，CLI 步骤态是串行的；"回放块"与追问在同一轮输出里成对出现，语义上不存在跨轮乱序。**真实风险是反过来的**：用户回答的是上一轮的追问，而本轮回放块可能已经推进到下一块——处理方式是回放块只复述"已确认事实"，追问才是新问题，二者在输出里分节标注，用户可分别纠正。已在 prompt 措辞中要求回放块与追问分节。
2. **并发写**：decisions.md 由 CLI 单一写入者（`src/decisions-io.js`）落盘，agent 手写正文散文；本变更不引入第二个写入者。Design Grill 子代理仍只被授权写 `review.json`（只读纪律不变），新增的"实现者视角问题清单"由**主代理**在回收后写入 review.json 的 reviewerNotes——子代理写通道面未扩大，双写竞态不存在。
3. **切换/生命周期**：本变更最重要的边界。会话中途中断后重入该步，prompt 会完整重渲染，新增的四条要求（来源标记/分块回放/三分出口/规模重估）自动重新可见，不依赖内存。**注意一处不变量**：该步既有约束"再次执行时输出只需增量汇报（新结论 + 新落盘决策）"必须与回放块共存——设计成"增量汇报 = 新回放块 + 新追问 + 新落盘决策"，而非取消回放。已落盘内容不重复回放（防上下文膨胀）。
4. **作用域**：纯 prompt 文本，无数据层，不存在跨仓/跨实例串台。唯一跨界是 Design Grill 子代理，其材料包由 CLI 组装注入（`review-material-pack.js`），作用域随变更目录；实现者视角四要素是对已有派发 prompt 的追加，不引入新的路径读取面。

## 风险与死路

- **最大风险：prompt 指令的遵循度不可机械验证**。本变更落的是"要求 agent 怎么做"，不是"CLI 拦不拦"。若 agent 不照做，测试仍会绿（测的是 prompt 产物面）。缓解：①措辞与既有铁律同风格（短、可判定、放决策点附近），避免被长文稀释；②七条要求里五条与已有机械面挂钩（决策落盘 API、review.json 的 reviewerNotes 会被 gate 读、Stage Review Gate 的阶段清单）——不照做会在后续门禁或评审中暴露。
- **次风险：与既有"一次只问一个"规则的表观冲突**。FR-03 允许 P1/P2 攒一轮问完，必须在 prompt 里显式写清分层（P0 逐轮、P1/P2 收尾一轮），否则 agent 会按错误的一侧执行。这是实现阶段要逐字核对的第一处。
- **第三风险：体积膨胀**。brainstorm 已经是仓内最长的阶段定义，加文本会推高每轮 token（该文件 567 行附近有"每轮全量回放是 token 膨胀主源"的历史教训）。缓解：四处新增合计控制在 60 行以内，且**不复制**四件套模板（仍由 CLI 落盘）。
- **既有测试回归面**：`test/brainstorm-exit-thin-default.test.mjs`、`test/brainstorm-plan-contract.test.mjs`、`test/prompt-placeholders.test.mjs` 可能对 brainstorm prompt 做字面断言。实现前先读这三支测试，确认新增文本不撞既有断言；若撞的是"整段等值"型断言则属测试面过紧、需按项目规范评估（不修改测试语义的前提下调整）。
- **放弃的方案**：
  - *用 review.json 新字段承载 builder 问题清单*：需要改 `validateStageReviewSchema` 与 gate 消费面，成本与风险均高于收益；reviewerNotes 是自由文本且已被 gate 读取，够用。
  - *新增阶段级"逃逸口对照表"文件或独立步骤*：违反"不新增步骤"的变更边界，且对照表只服务一处步骤，阶段级文件会变成无人维护的死文档。
  - *把分块回放做成 CLI 强制的输出模板（机械校验每轮必须含回放块）*：需要给步骤加输出结构校验，属状态机改动；且回放的"块"边界是语义判断，机械校验只会逼出占位式回放（合规但不解决问题）。

- **收口时已存在的无关失败（须如实声明，不属本变更回归）**：`test/doc-ref-check.test.mjs` 5 处失效锚（`docs/sillyspec/platform-interface-map.md:L137/139/140/142/200` 引用 `index.js:4563/4484/4436/4222/4320`）在本次改动前即存在——HEAD 版本 `src/index.js` 中 `triggerPull` 实际出现在 2932/2933/3166 等行，与文档锚定的行号窗口早已漂移；本变更未触及 `src/index.js`、`docs/sillyspec/platform-interface-map.md` 或任何锚目标。实测证据：单独运行该测试 5 处失效项均不含 `brainstorm`/`interaction-refine` 字样。
