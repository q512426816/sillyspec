---
author: flow-machine-draft
created_at: 2026-10-19T10:55:18.744Z
---
# 需求规格（Requirements）— 2026-10-19-cross-repo-face-tool-filter

## 功能需求

### FR-01: 注册路径不可达的 degradedReason 不再包含绝对路径（改为引用 local.yaml repos 键）

- 注册路径不可达分支的 `degradedReason` MUST NOT 嵌入本机绝对路径，MUST 引用 `local.yaml repos.<key>` 供人工定位；`repoPath` 字段仍保留在返回值供本机诊断。

#### 场景：降级原因脱敏

- Given local.yaml 注册了本机不存在的仓路径
- When collectRepoActual 降级
- Then degradedReason 含 repos.<key> 引用、不含注册值原文与仓根绝对路径

### FR-02: reconcileCrossRepoPlan 的跨仓文件面（rows/totals/patch）过滤工具治理模板（isToolGovernancePath 同源）

- 跨仓对账文件面 MUST 与主仓冻结面同口径剔除工具治理模板（isToolGovernancePath）；rows、totals 与 repos[].patch 正文 MUST 一致地不含模板路径；未标注探测的命中计数 MUST 同口径过滤。

#### 场景：跨仓模板剔除

- Given 跨仓窗口内同时有真实交付与 `.claude/**` 模板提交
- When 跨仓对账/冻结
- Then rows/totals/patch 只含真实交付

### FR-03: 新增用例覆盖：跨仓模板不入 repos[].patch、degradedReason 无路径

- 变更 MUST 交付用例断言跨仓 patch 正文与对账行不含 `.claude`、降级原因不含本机路径。

#### 场景：验证面

- Given e2e 夹具含模板提交与降级仓
- When flow done 归档
- Then 双断言命中

### FR-04: 既有跨仓/空面/过滤测试全绿

- 既有跨仓（baseline-anchor/patch-freeze/scope-audit-cross-repo）、空面、过滤测试 MUST 零回归。

#### 场景：回归面

- Given 实现完成
- When 运行相关套件
- Then 全部通过

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/thin-empty-face-crosscheck.test.mjs「空面 + 跨仓规范标注且跨仓有交付 → JSON-only 跨仓冻结」（deadkey 降级原因断言）
FR-02: test/thin-empty-face-crosscheck.test.mjs「空面 + 跨仓规范标注且跨仓有交付 → JSON-only 跨仓冻结」（.claude 剔除断言）
FR-03: test/thin-empty-face-crosscheck.test.mjs「空面 + 跨仓规范标注且跨仓有交付 → JSON-only 跨仓冻结」
FR-04: test/cross-repo-baseline-anchor.test.mjs 全文件；test/cross-repo-patch-freeze.test.mjs 全文件；test/scope-audit-cross-repo.test.mjs 全文件
