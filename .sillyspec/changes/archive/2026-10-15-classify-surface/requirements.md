---
author: flow-machine-draft
created_at: 2026-10-15T02:26:13.257Z
---
# 需求规格（Requirements）— 2026-10-15-classify-surface

## 功能需求

### FR-01: 收件箱 1~20 条时 digest 出 info 级 inbox 信号且带 classify 命令建议，healthy 保持 true

- 收件箱条数 ∈ [1,20] 时 collectKnowledgeDigest 必须产出 level='info' 的 inbox 信号，suggestion 必须含可执行的 classify 命令形态（knowledge classify --ql <id> --file <目标>）；该信号禁止打翻 healthy（healthy 只看 warn 级）。

#### 场景：主路径

- Given 收件箱 3 条，When collectKnowledgeDigest，Then info inbox 信号在场且 healthy=true（测试新增断言）。

### FR-02: 收件箱 >20 时仍 warn 级且 healthy=false（既有阈值语义不变）；空收件箱零信号

- 收件箱 >20 必须保持 level='warn' 且 healthy=false；收件箱为 0 时必须零 inbox 信号。

#### 场景：主路径

- Given 收件箱 25 条与 0 条两态，When 求值，Then warn+false 与零信号+true（测试新增断言+既有组）。

### FR-03: 渲染面 warn/info 分区，既有 digest 测试零回归+新增断言全绿

- renderKnowledgeDigestText 必须 warn 区（⚠️ 超阈段）与 info 区（ℹ️ 提示段）分区渲染；test/knowledge-digest.test.mjs 全文件零失败且含新三态断言。

#### 场景：主路径

- When 渲染 info 在场摘要，Then ℹ️ [inbox] 段与 classify 命令在场；全文件测试零失败。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/knowledge-digest.test.mjs「① 三信号阈值」（新增 info 三态断言组）
FR-02: test/knowledge-digest.test.mjs「① 三信号阈值」（>20 warn 态与空收件箱态）
FR-03: test/knowledge-digest.test.mjs（全文件零回归+新断言）
