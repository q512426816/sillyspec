---
author: flow-machine-draft
created_at: 2026-11-04T06:54:06.461Z
---
# 需求规格（Requirements）— 2026-11-04-question-typing-subagent-guard

## 功能需求

### FR-01: brainstorm.js 提问规则分型：意图/动机类开放式不附选项，决策类具名选项+必带推荐，原一刀切措辞移除

- src/stages/brainstorm.js 对话式探索节（B 节）第 7 条提问规则必须区分两类问法：意图/动机类问题（用户想要什么、为什么、成功什么样）必须开放式提出且不附任何示例选项；存在可命名取舍的决策类问题（技术选型、方案取舍、冲突仲裁）必须给具名选项并附各项代价与推荐理由；无条件通则「多选题优于开放式问题」必须从规则文本中移除。

#### 场景：主路径

- Given agent 处于头脑风暴对话探索且用户动机未说明，When agent 发起提问，Then 以开放式问题问 why 且同一消息不出现选项菜单（选项会锚定用户自己的措辞）。
- Given 对话中出现可命名取舍的冲突（如同一交互键被两个功能占用），When agent 需要用户拍板，Then 消息铺开具名选项+各自一句代价+明确推荐，而非裸问「选哪个」。

### FR-02: 仓库 AGENTS.md 与 templates/agents-instruction.md 同步含子代理豁免条款（子代理不跑流程命令，状态归主会话）

- 仓库根 AGENTS.md 与模板源 templates/agents-instruction.md 必须同步包含「子代理豁免」节：被派发/派生的子代理禁止运行 sillyspec 流程命令（立项/批准/收口/归档），只完成派单任务并回传结果，变更状态所有权归派单主会话；两份文件该节文本必须一致。

#### 场景：主路径

- Given 任一被派发子代理读取 AGENTS.md 接到派单任务，When 它感知到流程前提未满足（无活跃变更等），Then 它在回传中报告而非自行 flow start/approve/done。

### FR-03: 既有测试面全绿

- 本变更落地后既有测试面（收口推断面＋test:core 抽样）必须全部通过，不因提示词文本变更引入任何既有断言失败。

#### 场景：主路径

- Given 本变更两处文本修改已落地，When 收口实测跑变更测试面，Then 零失败零超时。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/brainstorm-prompt-discipline.test.mjs「提问分型规则文本断言」
FR-02: test/brainstorm-prompt-discipline.test.mjs「子代理豁免条款双文件同步断言」
FR-03: test/brainstorm-prompt-discipline.test.mjs「新增面自证」＋收口 CLI 推断实测面（fail-closed）
