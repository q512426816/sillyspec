---
author: flow-machine-draft
created_at: 2026-11-07T04:35:00Z
---
# 需求规格（Requirements）— 2026-11-07-knowledge-generated-retire

## 功能需求

### FR-01: knowledge refresh 子命令改为废弃提示（输出说明切块已退役与 scan 本体位置），不再写任何文件
- 必须将 cmdRefresh 行为改为废弃提示：输出说明 generated 切块已退役（死区+双源漂移实证）、scan 文档本体位置（docs 项目 scan 目录），并禁止任何写盘动作（原切块/INDEX 重写全下线）。

#### 场景：废弃提示
- Given：任意仓
- When：sillyspec knowledge refresh
- Then：输出废弃说明 JSON（ok:true, deprecated:true, 说明文案）；knowledge 目录零文件变化

### FR-02: 本仓 knowledge/generated/ 存量目录删除（34 文件）
- 必须删除本仓 knowledge 下 generated 整目录（34 个切块文件 + 其 INDEX）；删除后 validate/search/inspect 既有行为零回归（generated 本就零消费，删除零影响面）。

#### 场景：存量清理
- Given：本仓 generated 目录在场
- When：本变更交付
- Then：目录消失；sillyspec knowledge validate 仍 ok

### FR-03: 既有 knowledge 测试面全绿 + 新增用例锁 refresh 废弃行为（零写盘）+ help/SKILL 文案同步
- 必须保持既有 knowledge 测试面全绿；新增用例断言 refresh 零写盘与废弃提示；cmdKnowledge help 与 SKILL.md 的 refresh 描述必须同步为废弃说明（探针 cli-copy-selfsufficient：文案与行为一致）。

#### 场景：文案一致
- Given：本变更合入后
- When：查 help 与 SKILL.md 的 refresh 行
- Then：两处均为废弃说明，不再诱导用户跑 refresh

## 测试绑定（每条 FR 至少一行）

FR-01: test/knowledge-generated-retire.test.mjs「T1: refresh 废弃提示零写盘」
FR-02: test/knowledge-generated-retire.test.mjs「T2: validate/search 零回归（无 generated 前提）」
FR-03: test/knowledge-generated-retire.test.mjs「T3: help 与 SKILL 废弃文案同步」
