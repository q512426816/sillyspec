---
author: flow-machine-draft
created_at: 2026-10-19T10:31:43.568Z
---
# 需求规格（Requirements）— 2026-10-19-freeze-filter-tool-scaffold

## 功能需求

### FR-01: filterCommittedFace 剔除 .claude/.codex/.gemini/.opencode/.zcode/.cursor 目录与 CLAUDE.md；AGENTS.md 等项目指令文件保留为交付面

- 冻结面过滤 MUST 剔除工具注入面（六类 agent 工具目录与前缀匹配的 CLAUDE.md）；MUST NOT 剔除 AGENTS.md / INSTRUCTIONS.md（项目级指令可能是真实交付）；反斜杠路径 MUST 归一后同口径判定。同一判定 MUST 同步用于独占树脏面与孤儿面守卫的「交付」定义。

#### 场景：模板剔除

- Given 提交面同时含 `.claude/**`、`.codex/**`、`CLAUDE.md` 与正常源码
- When 计算冻结面
- Then 只剩源码，模板全部剔除

#### 场景：项目指令保留

- Given 提交面含 AGENTS.md / INSTRUCTIONS.md
- When 计算冻结面
- Then 两文件保留

### FR-02: 新增单测与 e2e 覆盖模板剔除、正常源码保留两态，既有冻结/空面/跨仓测试全绿

- 变更 MUST 交付单测（filterCommittedFace + isToolGovernancePath）与 e2e（flow done 归档后 files[]/change.patch 双面断言），既有冻结/空面/跨仓测试 MUST 零回归。

#### 场景：验证面

- Given 实现完成
- When 运行 test/filter-committed-face.test.mjs 与 test/thin-empty-face-crosscheck.test.mjs
- Then 全部通过

### FR-03: 归档 patch 的 files[]/change.patch 不再出现工具治理模板

- 归档件（change-patch.json files[] 与 change.patch 正文）MUST NOT 含工具治理模板路径；真实源码 MUST 照常入面。

#### 场景：归档双面

- Given e2e 变更同时改模板与源码
- When flow done 归档
- Then files[] 只有源码，change.patch 不含模板路径

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/filter-committed-face.test.mjs「工具治理模板剔除，项目指令文件保留」；test/filter-committed-face.test.mjs「isToolGovernancePath 只认工具注入面（AGENTS.md 返回 false）」
FR-02: test/filter-committed-face.test.mjs「反斜杠工具模板同样剔除」；test/thin-empty-face-crosscheck.test.mjs「e2e：.claude/ 与 CLAUDE.md 剔除，正常源码保留」
FR-03: test/thin-empty-face-crosscheck.test.mjs「e2e：.claude/ 与 CLAUDE.md 剔除，正常源码保留」
