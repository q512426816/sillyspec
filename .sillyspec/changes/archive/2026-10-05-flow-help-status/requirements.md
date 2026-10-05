---
author: flow-machine-draft
created_at: 2026-10-05T14:33:24.294Z
---
# 需求规格（Requirements）— 2026-10-05-flow-help-status

## 功能需求

> FR 由你撰写：每条 = `### FR-NN: 标题` + 一句带强度词的行为规定（必须=硬性；禁止=红线；
> SHOULD=建议须注理由；可以=可选）；边界情形加场景块 `#### 场景：名` + Given/When/Then 行。
> 标题行是成功标准锚（勿改写——收口做门柱对比）；正文与场景块归你。

### FR-01: src/flow.js 的 flow 用法行包含 flow status --change <名> 子命令提示

`sillyspec flow`（无子命令）输出的用法行必须同时列出 start / done / status 三个子命令，其中 status 形态为 `flow status --change <名>`——帮助面与实际能力面（src/flow.js:1764 起的 status 子命令）保持一致。

#### 场景：主路径

- Given：用户运行 `sillyspec flow` 或 `sillyspec flow --help`（无子命令）
- When：flow.js 走到默认用法分支（src/flow.js:1907）
- Then：用法行文本包含 `sillyspec flow status --change <名>` 提示，且原有 start/done 段与 --input 格式教学不变

### FR-02: 测试断言用法行包含 flow status 提示

必须有测试锁定 FR-01：断言 src/flow.js 用法行源码文本包含 `flow status --change <名>`，防止后续改帮助文本时丢失该提示。

#### 场景：主路径

- Given：本变更已合入 src/flow.js 与测试文件
- When：运行 node --test 覆盖该测试
- Then：断言通过；若用法行被改掉不含 status 提示，测试失败

### FR-03: 相关测试全部通过

本变更触达的测试面（新增测试 + FR 关联回归）必须全部通过，flow done 时 CLI 实测为准。

#### 场景：主路径

- Given：src/flow.js 用法行已更新、测试文件已就位
- When：执行本变更测试集
- Then：全部用例 pass，无 fail

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/flow-help-status.test.mjs「用法行列出 flow status 子命令」
FR-02: test/flow-help-status.test.mjs「用法行列出 flow status 子命令」
FR-03: test/flow-help-status.test.mjs「用法行保留 start/done 与 --input 格式教学」
