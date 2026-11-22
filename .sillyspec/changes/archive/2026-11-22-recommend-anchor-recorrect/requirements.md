---
author: flow-machine-draft
created_at: 2026-11-22T15:45:33.582Z
---
# 需求规格（Requirements）— 2026-11-22-recommend-anchor-recorrect

> 来源：mattpocock 链路实测沉淀（retro-report.md 感知 1/3——推荐放大调研浅度实证、用户两次中途纠偏实证；提取器路径噪音票 04/05 双实证）。

## 功能需求

### FR-01: brainstorm 提问分型协议（brainstorm.js:114 段）新增纪律：决策类问题的推荐必须附一手依据锚（file:line/文档路径/盘点产出），无依据时不给推荐降级为开放问

- 提问分型协议（brainstorm.js 第 7 条）**必须**新增推荐依据锚纪律：决策类问题给出推荐时，**必须**在推荐后以「依据：」前缀附一手依据锚（file:line、文档路径、盘点/调研产出引用之一）；**无一手依据时禁止给推荐**——降级为开放式提问并如实声明「依据不足，暂不给推荐」。
- 既有分型语义（意图问禁选项/决策问必带选项与代价/「是」即接受推荐）**必须**零变化——本条是增量约束，不改写既有句子。

#### 场景：主路径（推荐带锚）
Given 决策类问题存在仓内一手依据 / When agent 按分型协议提问 / Then 选项+代价+推荐+「依据：file:line 或文档路径」齐备。

#### 场景：无依据降级
Given 决策类问题无一手依据（仅有推理/直觉） / When agent 提问 / Then 不出现推荐句式，改开放问并声明依据不足。

### FR-02: 全局交互询问指引段（run/prompt.js waitOptions 注入处）新增中途纠正协议：用户表达没听懂/纠正方向时，停当前动作，用词汇基准与简化语言复述理解的目标，确认后再继续

- 交互询问指引（prompt.js 两处 wait 提问输出，:2318/:2330 附近）**必须**各新增中途纠正协议一句：用户表达「没听懂/不对/你理解错了」或纠正方向时——**必须**先停当前动作，用词汇基准（知识注入「📖 词汇基准」段，在场时）与简化语言复述「我现在理解的目标」，**必须**经用户确认后才继续；**禁止**带着未确认的旧理解继续执行。
- 两处注入点措辞**必须**同源；autoMeta（脚本驱动）分支不注入（与既有 AskUserQuestion 指引同分支条件）。

#### 场景：纠正触发
Given wait 步用户回复为纠正/否定理解语义 / When agent 处理 / Then 先复述理解的目标并等确认，确认后才执行原动作。

#### 场景：无纠正零回归
Given 用户正常作答 / When agent 处理 / Then 行为与现状一致。

### FR-03: _extract.mjs demo 变更目录路径锚定为仓相对路径，任意目录再生产出零路径噪音 diff

- _extract.mjs **必须**在写盘前把输出中出现的 demo 变更目录绝对路径（root 按 __dirname 推导产生）归一化为仓相对形 `.sillyspec/changes/2026-05-13-demo-change`；正斜杠与反斜杠两种形态**必须**都归一；归一逻辑**必须**实现为可导入函数（export）供测试直测。
- 主仓与任意 worktree 下分别运行提取，产出的 _extracted.json **必须**逐字节一致（环境无关可移植）。

#### 场景：worktree 再生
Given 在 worktree（root 解析为 worktree 绝对路径）运行 _extract.mjs / When 与主仓产物对比 / Then 逐字节一致，输出中无绝对路径。

#### 场景：归一函数直测
Given 含绝对路径（正/反斜杠两种）的样例串 / When 调用归一函数 / Then 均替换为仓相对形，无绝对路径残留。

### FR-04: 金档再生一致（brainstorm.md/_extracted.json 同步），prompt-golden 与既有提示词测试零回归

- brainstorm prompt 变更后**必须**跑 node docs/prompt/_extract.mjs 再生（依赖 FR-03 归一化后无路径噪音），docs/prompt/brainstorm.md 与 _extracted.json 同步更新；test/prompt-golden 与既有提示词族测试（thin-user-decision-record/prompt-injection-gaps/brainstorm-prompt-discipline 等）**必须**零回归。

#### 场景：金档一致
Given 三处源码改动落盘 / When 再生金档并跑提示词测试族 / Then 金档反映新增纪律行，全部测试绿。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例」`；空行/待填在 flow done 拒收）

FR-01: test/brainstorm-prompt-discipline.test.mjs「提问分型段含依据锚纪律行（新增断言）」
FR-02: test/output-step-render.test.mjs「交互指引含中途纠正协议行（requiresWait/mayNeedWait 两处新增断言，76/0 绿）」
FR-03: test/prompt-extract-portable.test.mjs「归一函数直测+金档现状无绝对路径（新文件）」
FR-04: test/prompt-golden.test.mjs「金档哈希锁绿（SILLYSPEC_REGEN_PROMPT_GOLDEN 合法通道再生基线）」+ docs/prompt/_extracted.json 再生产物一致（命令面验收；注：brainstorm.md 镜像历史形态不含提问分型段，无可同步面，非本次引入缺口）
