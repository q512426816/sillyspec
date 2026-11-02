---
author: flow-machine-draft
created_at: 2026-11-02T14:00:00.000Z
---
# 需求规格（Requirements）— 2026-11-02-constraint-mechanize

## 功能需求

### FR-01: FR-01 规约 00 反例：flow.js:311 恒注入行附一条任务词汇反例（如「评测工具缺省写死两仓路径即违规——每条路径必须来自 --repo 参数或缺省当前仓」），反例用用户原话的任务词汇非政策话语

flow.js 的内置规约 00 恒注入行必须追加一条任务词汇反例（用户纠正原话的措辞——「评测工具缺省写死两仓路径即违规」），禁止使用政策话语升维（不写「工具中立性原则」类抽象词）；反例必须是可 grep 的具体违规形态描述。

#### 场景：反例词汇

Given 恒注入面输出
When agent 读到规约 00
Then 反例行含任务词汇（写死/路径/--repo）而非政策词（中立性/开放世界）

### FR-02: FR-02 事故转写自检：decision-distill 的评审探针/收割面（complete 门/review probes）加一道自检——当本变更执行期有用户会话纠正时，提示「用户的纠正原话转写进了哪一层（测试/门/接口/规约）」，未转写则 decisions add 时要求补「落地层：」字段（D-002 先例已有此字段形态）

decision-distill 的 complete 门探针（或 review probes 注入面）必须加一道「用户纠正原话转写进了哪一层」自检提示：当本变更 decisions.md 含「用户原话保留」标记（D-002 先例字段）或「死路」注记的事故类条目时，提示 agent 回答转写层；decisions add 的字段提示面（如有 usage/help 文案）必须提及可选的「落地层：」字段。

#### 场景：事故类条目触发

Given decisions.md 含「用户原话保留」的事故类条目
When complete 门/review 跑
Then 输出提示「用户纠正原话转写进了哪一层（测试/门/接口/规约）」自检

### FR-03: FR-03 模板更新：AGENTS.md 的规约 00 或知识库 conventions 加任务词汇反例注记（持久载体）

AGENTS.md 的规约 00（00. 不要枚举定义开放世界…）或知识库 conventions.md 的配置与机制设计纪律条目必须附任务词汇反例注记（持久载体——跨会话存续）。

#### 场景：注记在场

Given 变更完成
When 读 AGENTS.md 或 conventions.md
Then 规约 00 附近含任务词汇反例（可检索）

### FR-04: FR-04 验收：六探针 GREEN 五面零回归 + lint 绿 + 既有测试全绿 + 注入面文案变更不破注入测试（探针更新如需）

验收必须全绿：eval 六探针 GREEN、五面零回归、lint 通过、既有测试全绿（注入面文案若变化则同步更新受影响断言）。

#### 场景：注入面回归

Given 恒注入行变化
When 跑 flow/inject 测试
Then 全绿（文案变更不破格式断言）

## 测试绑定（每条 FR 至少一行——「FR-NN: test/路径「用例名」」；空行/待填在 flow done 拒收）

FR-01: test/knowledge-fusion.test.mjs「注入面文案含任务词汇反例」或 test/knowledge-inject.test.mjs（源码锁）
FR-02: 不适用：探针提示文案（advisory 面无行为断言；D-002 先例已有落地层字段）
FR-03: 不适用：模板注记（纯文档）
FR-04: test/knowledge-inject.test.mjs + test/knowledge-fusion.test.mjs 回归
