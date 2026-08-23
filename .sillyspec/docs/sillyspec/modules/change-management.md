---
author: qinyi
created_at: 2026-06-01T09:05:00
updated_at: 2026-08-24T00:40:00+08:00
---

# change-management
> 最后更新：2026-08-23
> 最近变更：2026-08-23-adopt-harness-practices（quicklog 根因块嵌套四子字段 + buildPushPayloadFromRaw 字段块复位修复）/ 2026-08-16-scan-docs-reconcile（quicklog.js 补录归属）/ ql-20260807-010-9897（keepSillyspecDocs option：模块文档 .sillyspec/docs/ 可进清单）/ ql-20260713-001-3e46（文件清单标题编号前缀容忍）
> 模块路径：src/change-list.js, src/quicklog.js

## 职责
从 design.md 解析文件变更清单（change-list.js），提取受影响文件路径集合供 verify 等阶段做文件级别校验；兼管 QUICKLOG 台账的 CLI 接管（quicklog.js）。

## 当前设计
`parseFileChangeList` 是一个纯同步函数，接收 design.md 文件路径，返回 `Set<string>`。它定位 design.md 中"文件变更清单"标题下的 Markdown 表格，解析表格第二列的文件路径，过滤掉空路径、占位符（`—`/`-`）和 `.sillyspec/` 内部路径。

模块设计极简，单文件单函数，无状态、无副作用。解析逻辑基于正则匹配 Markdown 表格行（`|` 分隔），跳过表头和分隔行。设计为 verify 阶段的前置工具：验证实现产出是否覆盖了 design 中声明的全部目标文件。

**src/quicklog.js** 是 QUICKLOG 记录的 CLI 接管层：ql-ID 分配 + 条目追加 + O_EXCL lockfile 串行化全部下沉 CLI 进程内，消除 agent 手写漏记静默通过与多 quick 会话并发读-改-写丢更新（历史实证同一 ql-ID 出现两次）；导出 allocateQuicklogEntry / completeQuicklogEntry / findQuicklogEntry / deriveTitleFromLinkedChange / withFileLock 等，由 src/run/（command / complete-handlers / complete / stage）import 消费；无新 npm 依赖（仅 fs/path/crypto）。

**根因块嵌套四子字段**（2026-08-23-adopt-harness-practices，D-004@v1 / task-07）：postmortem 场景根因块内按列表行写 `- 现象：`/`- 根因：`/`- 护栏：`/`- 证据：` 四子字段为**合法形态**——顶层标签白名单正则 `^` 行首锚定（`src/quicklog.js:182`），「- 」前缀不匹配顶层标签、经 lastLabel 挂载进 body_sections[根因]，顶层四字段边界解析不受影响（R-03）；旧条目（无嵌套子字段）回退不受影响。
`buildPushPayloadFromRaw`（`src/quicklog.js:158`）字段块复位修复——进入 需求/根因/方案/结果 字段块须关闭 inFiles/inLinked 续行模式，否则嵌套子字段列表行被「文件 bullet」分支劫进 payload.files、从根因正文截断丢失；
复位点在 `src/quicklog.js:198-199`；单行四字段切分声明（`src/quicklog.js:493-500`）：边界扫描只作用于「单行四字段压缩归一」路径，嵌套列表行形态天然兼容无需改动三个边界函数（Grill C-15）。

## 对外接口（表格）
| 函数/常量 | 说明 | 参数 |
|-----------|------|------|
| `parseFileChangeList(designMdPath)` | 从 design.md 解析文件变更清单，返回文件路径集合 | `designMdPath: string` -> `Set<string>` |

## 关键数据流
1. 调用方传入 design.md 绝对或相对路径
2. 函数读取文件内容，定位 `## 文件变更清单` / `### 文件变更清单` 标题（容忍可选编号前缀，如 `## 6. 文件变更清单` / `## 6) 文件变更清单`——与 brainstorm Step11 design 章节编号约定对齐）
3. 截取该标题到下一个 `##` 标题之间的内容
4. 逐行解析 Markdown 表格，提取第二列（文件路径列）
5. 过滤无效路径后返回 `Set<string>`

## 设计决策（表格）
| 决策 | 原因 | 替代方案 |
|------|------|----------|
| 基于 Markdown 表格解析 | design.md 的文件变更清单天然是表格格式 | 自定义标记语法 / JSON 配置 |
| 过滤 `.sillyspec/` 路径 | SillySpec 内部文件不属于业务变更范围 | 不过滤，由调用方判断 |
| 返回 `Set` 而非数组 | 天然去重 + O(1) 查找 | 返回数组 |
| 纯同步函数 | 文件小，无需异步 | async + fs.promises |

## 依赖关系
- 内部依赖：无
- 外部依赖：`fs`（`readFileSync`, `existsSync`）

## 注意事项
- 函数对 design.md 不存在或找不到"文件变更清单"标题的情况做了容错处理，返回空 `Set`
- 依赖 design.md 中表格的第二列是文件路径列，如果表格格式变化需同步修改解析逻辑
- 表头行通过首次出现的表格行自动跳过，假设第一行是表头
- 章节标题正则 `FILE_LIST_SECTION_RE` 容忍可选编号前缀（`## 6. 文件变更清单`），同义词集与 `src/stage-contract.js` 对齐，避免两个校验器对「有没有清单」给出矛盾结论
- 根因块嵌套四子字段（`- 现象：` 等列表行）是合法 postmortem 形态：顶层四字段边界不动、旧条目回退不受影响——改顶层标签白名单或边界扫描逻辑时须保持「嵌套列表行不构成新顶层边界」不变量（R-03 / Grill C-15 回归测试 quicklog-postmortem-fields.test.mjs）

## 变更索引（表格，初始为空）
| 日期 | 变更名 | 摘要 |
|------|--------|------|
| 2026-07-13 | ql-20260713-001-3e46 | `FILE_LIST_SECTION_RE` 加可选编号前缀 `(?:\d+[.)]\s*)?`，`## 6. 文件变更清单` 不再让解析返回空、plan Step4 postcheck 不再硬阻断 |
| 2026-08-07 | ql-20260807-010-9897 | `_parseFileListDetailed` 加 `keepSillyspecDocs` option（默认 false 跳过全部 `.sillyspec/` 保持 review-tier fileCount 判档，true 时保留 `.sillyspec/docs/` 模块文档=交付物），`parseFileChangeList`/`Detailed` 透传 opts；供 `resolveApplyAllowSet` 识别模块文档清单（原 change-list 跳过 `.sillyspec/` 与 `filterDeliverableFiles` 保留 `.sillyspec/docs/` 语义打架） |
