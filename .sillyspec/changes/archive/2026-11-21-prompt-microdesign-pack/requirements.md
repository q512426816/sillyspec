---
author: flow-machine-draft
created_at: 2026-11-21T15:30:29.822Z
---
# 需求规格（Requirements）— 2026-11-21-prompt-microdesign-pack

## 功能需求

### FR-01: brainstorm.js 的 design.md 模板新增「测试 seam 约定」节：列出本变更测试落点，每个 seam 附一行「能查出什么/查不出什么」

- brainstorm.js「design.md 必须包含的章节」模板必须在「8. 数据模型」与「9. 兼容策略」之间新增「8.5 测试 seam 约定」节：触及代码/测试面的变更必须列出测试落点 seam，每个 seam 附一行「能查出什么/查不出什么」；纯 doc/配置变更必须写豁免短语「不涉及测试 seam」。配套联动必须同步：design-facts.js generateDesignSkeleton 骨架加对应节（标题逐字对齐模板，R-03）、design-facts.js 与 index.js 的「十三章节」措辞必须改「十四章节」、test/design-facts.test.mjs 章节契约必须同步扩断言。

#### 场景：主路径

- Given 一次触及 src/test 的变更走 brainstorm
- When design.md 按 8.5 节作答
- Then 测试落点在动码前显式约定，每个 seam 的检出边界一句话可查

### FR-02: brainstorm.js 提问纪律补「问题措辞让『是』即接受推荐答案」

- brainstorm.js「提问分型」条必须补措辞纪律：带推荐的决策类问题必须把问题措辞成「是」即接受推荐答案——用户以肯定回答即可采纳推荐，无须重新组织答案。

#### 场景：主路径

- Given brainstorm 决策类问题带推荐选项
- When 用户回答「是/对/可以」
- Then 语义唯一指向接受推荐项，无歧义分支

### FR-03: execute.js 代码审查步骤补三层优先级：CONVENTIONS 覆盖 smell 基线、基线仅 judgement call、工具已拦不人工报

- execute.js「代码审查」步骤审查要点必须改为三层优先级：①仓内文档化规范（CONVENTIONS.md/ARCHITECTURE.md）必须优先覆盖通用基线——仓规背书的写法即使踩中通用 smell 也不报；②通用 smell 基线（无仓规覆盖处适用）必须只作 judgement call 标注（「疑似 X」），不作硬违反；③lint/formatter/pre-commit/CI 等工具已机械拦截的项必须不再人工审查报告。

#### 场景：主路径

- Given 代码审查步骤对 diff 出报告
- When 某写法有仓规背书但踩中通用 smell
- Then 不报；未背书处命中 smell 必须标 judgement call 而非硬违反

### FR-04: execute.js 测试纪律补 [DEBUG-<id>] 前缀约定与「变异造红后 diff 干净副本自证」

- execute.js「运行测试」步骤铁律必须补：临时调试日志必须带 `[DEBUG-<id>]` 唯一前缀，排查完必须按前缀 grep 清零再交付。「反例测试核对」段必须补：通过临时改代码/fixture 强制造红验证测试灵敏度时，必须 diff 干净副本确认变异真实生效后再信该红——变异未落盘/未生效时红来自别处，属假灵敏度。

#### 场景：主路径

- Given agent 插桩调试后交付
- When 收尾 grep `[DEBUG-` 前缀
- Then 零残留；变异造红的灵敏度验证以 diff 自证为信

### FR-05: verify.js 的 verify-result 风险节补「单向门/双向门+一词爆炸半径」字段

- verify.js「输出验证报告」步骤对「变更风险等级」section 的填写要求必须补两行回退语义字段：`回退门：<单向门（难回滚）/双向门（易回滚）>` 与 `爆炸半径：<一词概括最大影响面>`；verify-probes.js 骨架「变更风险等级」节的 TODO 槽必须同步补这两字段占位。

#### 场景：主路径

- Given verify-result.md 风险节填写
- When distill/push 决策消费该节
- Then 回退难度与影响面以固定字段可读，不靠散文提炼

### FR-06: 新建 docs/sillyspec/out-of-scope/（README 说明用途+首个被拒概念文件）

- 必须新建 docs/sillyspec/out-of-scope/ 目录：README.md 必须说明用途（每个被拒绝的概念/提案一个文件，附原始编号与理由，重复提案引用文件即可关掉）；首个文件必须登记「mattpocock/skills 全量照搬流程形态」被拒概念（理由引用 docs/ROADMAP.md 不抄清单，不双写正文）。

#### 场景：主路径

- Given 后续有人提议全量照搬 mattpocock 流程形态
- When 检索 out-of-scope
- Then 一份文件直接引用回应，无须重新论证

### FR-07: 改动后运行 node docs/prompt/_extract.mjs 同步 docs/prompt/ 镜像

- 提示词改动完成后必须运行 `node docs/prompt/_extract.mjs` 再生 docs/prompt/ 镜像；prompt 金档必须以 `SILLYSPEC_REGEN_PROMPT_GOLDEN=1 node --test test/prompt-golden.test.mjs` 再生并随同一提交入库，镜像/金档与源必须零漂移。

#### 场景：主路径

- Given src/stages/*.js prompt 文本已改
- When 镜像与金档再生
- Then docs/prompt/_extracted.json 与 test/prompt-golden.json 反映新文本且测试全绿

### FR-08: 相关既有测试零回归

- 本变更后必须零回归：test/design-facts.test.mjs、test/prompt-golden.test.mjs、test/brainstorm-exit-thin-default.test.mjs 全绿（design-facts 章节契约属扩断言后的新契约）。

#### 场景：主路径

- Given 改动合入
- When 运行上述测试
- Then 全部通过

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/design-facts.test.mjs「十四章节标题契约（含 8.5 测试 seam 约定，字面、有序、无多无漏）」
FR-02: test/prompt-golden.test.mjs「brainstorm 阶段金档哈希锁（随变更再生成后全过）」
FR-03: test/prompt-golden.test.mjs「execute 阶段金档哈希锁（随变更再生成后全过）」
FR-04: test/prompt-golden.test.mjs「execute 阶段金档哈希锁（随变更再生成后全过）」
FR-05: test/prompt-golden.test.mjs「verify 阶段金档哈希锁（随变更再生成后全过）」
FR-06: 不适用：纯文档新增（README+被拒概念文件），无代码行为面，验收靠收口 diff 核对
FR-07: 不适用：镜像/金档再生属构建产物同步，验收靠收口 diff 核对镜像与源一致
FR-08: test/design-facts.test.mjs「全量零回归（十四章节新契约+六章 readiness+literal-any 门禁）」
