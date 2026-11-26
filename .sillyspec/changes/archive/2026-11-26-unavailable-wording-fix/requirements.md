---
author: flow-machine-draft
created_at: 2026-11-26T14:21:28.116Z
---
# 需求规格（Requirements）— 2026-11-26-unavailable-wording-fix

## 功能需求

### FR-01: .sillyspec/local.yaml 的 commands 段注释改为如实描述（unavailable=不显式指定，执行层回退结构推断仍会跑）

- `.sillyspec/local.yaml` 的 `commands` 段注释 **必须** 如实描述 `test: unavailable` 的实际语义：取消显式命令，`extractTestCommand` 返回 null 后执行层回退项目结构推断并照跑；**禁止** 出现「unavailable→skip 逃逸」「关闭亲跑」类表述。

#### 场景：读配置的人看到真话
- Given 打开 `.sillyspec/local.yaml` 的 commands 段
- When 阅读注释
- Then 注释说明「unavailable = 不显式指定命令，执行层回退结构推断（package.json scripts.test / pytest）仍会跑」；不出现「跳过实测」语义

### FR-02: src/stages/archive.js 首步注释与 docs/sillyspec/file-lifecycle.md 的「D-008 关闭亲跑」表述改为如实语义

- `src/stages/archive.js` 首步注释与 `docs/sillyspec/file-lifecycle.md` 的 archive 行 **必须** 删除「D-008 关闭亲跑」类失真表述，改为如实语义（本仓显式命令置 unavailable，执行层回退结构推断照跑；收口门实测仍阻断归档）。

#### 场景：文档与代码一致
- Given 读者查 archive 首步说明或 file-lifecycle 阶段表
- When 对照 `verify-postcheck.js` 的 `extractTestCommand` / `runFullCommand` 行为
- Then 文字与代码行为一致（unavailable ≠ 跳过）

### FR-03: 全仓不再出现失真表述

- `grep -rn "unavailable→skip\|关闭亲跑" src docs .sillyspec/local.yaml .sillyspec/knowledge` **必须** 零命中（历史归档件 `.sillyspec/changes/archive/**` 除外——归档是历史事实，不改写）。

#### 场景：护栏清零
- Given 订正完成
- When 执行上述 grep
- Then 仅历史归档件命中（若知识库有则一并订正）

### FR-04: 行为零变化

- 本变更 **禁止** 修改任何实测/门禁逻辑与配置取值（`commands.test: unavailable` 保留原值）；`node test/check-syntax.mjs` **必须** 绿。

#### 场景：只动文字
- Given 本变更 diff
- When 审阅
- Then 仅注释/文档文字变化，无逻辑行改动；lint 1103 文件绿

## 测试绑定

FR-01: 不适用：纯配置注释订正，无行为面（验收靠 grep 文案断言）
FR-02: 不适用：纯注释/文档订正，无行为面（验收靠 grep 文案断言与 file-lifecycle 对照）
FR-03: 不适用：验收命令为 grep 清零（见成功标准），非测试用例
FR-04: node test/check-syntax.mjs（全仓语法与模块映射校验）
