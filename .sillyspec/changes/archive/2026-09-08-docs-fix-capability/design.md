---
author: qinyi
created_at: 2026-09-08 08:55:00
scale: large
---

# 设计文档（Design）— 2026-09-08-docs-fix-capability

## 背景

multi-agent-platform 仓 2026-09-07 完成 1058→0 文档失效引用清理（提案：平台仓 docs/sillyspec/2026-09-07-docs-check-fix-improvement-proposal.md），复盘发现约 80% 修复工作是确定性操作，本可由 CLI 完成。本仓评估（2026-09-08，用户确认）后落地其中有价值的四项：

1. 解析修复——工具解析缺陷造成约 6 处「修不掉的假阳性」（括号路径被截断、省略号路径被当字面路径）
2. `docs migrate --from/--to`——批量路径前缀迁移（清理中 567 处路径修复的确定性大头，当时靠手写临时脚本）
3. snapshot/archive 豁免——历史快照文档引用天然过时，不应计入门控
4. candidates JSON——失效引用的候选信息只存在于人类可读文本，脚本无法消费
5. 报告出口统一 stdout——docs check 失败报告走 stderr，脚本 capture_output 只读 stdout 拿空（用户 2026-09-08 实证踩坑，D-005 添头项）

## 设计目标

- FR-1 假阳性清零：Next.js 路由组 `app/(dashboard)/x.tsx:21` 全量提取且 markdown 链接零回归；含 `...` 的模糊路径跳过校验；顿号并列引用拆分行为测试锚定
- FR-2 `sillyspec docs migrate --from X --to Y`：默认 dry-run 计划、`--apply` 写盘（复用 applyFixes）、写盘后自动 docs check 复核、目标不存在时 unverified 警示
- FR-3 豁免双通道：路径段 `archive/`、`finished/` 自动豁免 + frontmatter `doc_type: snapshot` 显式豁免，`--no-exempt` 可关
- FR-4 `docs check --json` 的 fix 对象增 `candidates` 数组（行号歧义候选 / 同名文件候选）
- FR-5 非 JSON 模式下报告内容（失效清单/重锚报告/修复指引）统一 stdout，stderr 仅留运行时诊断（D-005）；--json 与 exit code 不变

## 非目标

- 不做路径自动推断引擎（置信度打分、上下文匹配）——D-001
- 不做 `docs fix` 一站式循环收敛命令、`--interactive` 交互确认——D-001
- 不做 `docs gate --delta-only`（基线 0 时计数 ratchet 与逐条语义等价）——D-001
- 不支持 `第 N 行` 中文行号记法的引用提取（记法体系变更超本次边界）
- 不改 docs gate 判定逻辑（gate 复用 runDocsCheck，豁免语义自动跟随）

## 拆分判断

单 change 不拆：四项同域（docs-consistency 模块）、共享提取器与测试 fixture、总量 ~5 文件属 small 规模，拆分反增流程开销。

## 总体方案

### Phase 1（FR-1/3/4：docs-check.js 内聚改动）

REF_RE 文件段从单字符集 `[A-Za-z0-9_.\-\/]+` 改为**展开循环形** `[A-Za-z0-9_.\-\/]*(?:\([A-Za-z0-9_.\-\/]+\)[A-Za-z0-9_.\-\/]*)*`：普通段可选 + 零或多个「闭合括号段+普通段」迭代。⚠ 初稿原子序列 `(?:A+|B+)+` 被 Design Grill 实证 ReDoS（n=30 长 token 无 `:N` 后缀 → 73.8s，GitHub 源码 URL/Java FQN 即触发）——「首字符不相交→无灾难回溯」推理不成立（只覆盖分支间歧义，未覆盖 plain 分支跨外层迭代的划分歧义）；展开循环每次迭代必含括号段 → 划分唯一 → 线性（Grill 已验证 6 用例行为等价、evil 用例 0.01ms）。markdown 链接 `[t](foo.js:12)` 提取 `foo.js:12`（与现状一致，零回归）；`app/(dashboard)/x.tsx:21` 全量提取；嵌套 `((x))` **部分提取** `/foo.js:9`（Grill 实证，与旧正则行为一致非回归；陈述从「不匹配」修正为「部分提取可能误报」）。

`runDocsCheck` ref 循环前置两道跳过：`r.file` 含 `...` → `skippedFuzzy++` 不计 total；豁免判定见 FR-3。顿号（、）等全角标点不在字符集内，`a.py:21、b.py:63` 天然拆两条——仅测试锚定，无代码改动。

豁免：docFiles 循环内，路径段判定（POSIX 归一后任一段 === `archive`/`finished`）在 readFileSync 前免 IO；frontmatter 判定（文件头 `---` 块内行 `doc_type: snapshot`，容忍行内注释与首尾空白，带引号不识别——机械精确匹配不做 YAML 解析）在读取后。豁免文档整体跳过、`skippedExempt` 计文档数。`opts.exempt !== false` 默认开。与 skip 配置关系（Grill 对账）：skip 在 walkGlob 层排除文档、豁免在 docFiles 循环内跳过——机制正交；CLI 位置参数显式点名的文档同样豁免（豁免语义挂在文档性质上，不挂在校验发起方式上；要校验 archive 文档用 `--no-exempt`）。

candidates：classifyFix 歧义同分 tie 分支附 `candidates: [{file, line}]`；「文件不存在」分支仅对**带 `/` 路径**的引用附 basename 树扫候选（Grill 修正：裸文件名引用 resolveCandidates 已全树扫且返回空时 basename 重扫恒空，无意义——candidates 只对带路径引用产出），复用 treeCache。仅进 --json 面。

报告出口（FR-5，D-005）：非 JSON 模式下 `docs check` 失效清单/重锚报告/修复回执/修复指引从 console.error 改 console.log（index.js 报告段逐行调整）。stderr 保留 console.warn 的 ⚠️ 诊断行与配置错误（exit 2 路径）。--json 与 exit code 语义逐字节不动。**gate 改动面为零**（Grill 实证：docs gate 非 JSON 输出本已 console.log，index.js ~1731；design 初稿「同归 stdout」暗示有待改项，修正为零改动）。

### Phase 2（FR-2：新模块 docs-migrate.js + CLI 分流）

`planDocsMigrate` 以 docs check 同源配置（readDocsCheckConfig paths/skip，校验面即改写面）收集文档，`collectDocRefs` 提取后过滤 `r.file.startsWith(from)`，`newRef` = `to + file.slice(from.length)`（行号段原样）；每个目标跑 `resolveCandidates` 验证，0 候选标 unverified。`runDocsMigrate` 默认 dry-run 打印计划表；`--apply` 走 `applyFixes(projectRoot, plans)`（条目 shape 完全一致，含 R-04 行内偏移防护），随后自动 `runDocsCheck` 报迁移后失效数。CLI：`docs migrate --from/--to [--apply]` 进新语义；无 flag 落回旧结构迁移 `migrateDocs(dir)`（兼容保留 + deprecated 提示）。**exit code 契约（Grill 阻断项补写）**：0 = dry-run 零计划或 --apply 后 postCheck 全绿；1 = --apply 后仍有失效或存在 unverified 计划（不回滚——dry-run 已给计划、unverified 已警示）；2 = 用法/配置错误（缺 --from/--to、glob 形态不支持等）。dry-run 有计划恒 exit 0（预览不判成败）。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/docs-check.js | REF_RE 展开循环形（FR-1.1，Grill 修订：原子序列形 ReDoS 实证否决）；runDocsCheck 增 fuzzy skip + 豁免插点 + exempt 开关（FR-1.2/FR-3）；classifyFix tie 分支与文件不存在分支增 candidates（FR-4，producer=classifyFix/树扫 → 序列化点=CLI --json console 输出 → consumer=平台仓巡检脚本，新增字段不删旧字段） |
| 新增 | NEW:src/docs-migrate.js | planDocsMigrate/runDocsMigrate（import 复用 docs-check 的 collectDocRefs/applyFixes/runDocsCheck/readDocsCheckConfig，不复制解析正则——D-004） |
| 修改 | src/index.js | docs 分派：migrate 有 --from/--to 走新语义、无 flag 落回 migrateDocs；check flag 白名单加 --no-exempt；FR-5 报告段 console.error→console.log（保留 warn/配置错误在 stderr；gate 输出本已在 stdout——index.js ~1731，FR-5 对 gate 零改动面，Grill 修正）；CLI 用法文本补 docs migrate/--no-exempt 说明 |
| 修改 | test/docs-check-fix.test.mjs | FR-5 通道迁移改造：15+ 处 stderr 断言与 S7 逐字节通道一致测试按新出口契约更新（Grill 阻断项，原清单遗漏） |
| 新增 | NEW:test/docs-fix-capability.test.mjs | FR-1/3/4 单测 |
| 新增 | NEW:test/docs-migrate.test.mjs | FR-2 单测 |
| 修改 | .sillyspec/docs/sillyspec/modules/docs-consistency.md | 模块文档同步四项能力（豁免后 invalid 只减不增，dogfood 基线复核） |
| 修改 | .sillyspec/docs/sillyspec/modules/_module-map.yaml | docs-consistency.paths 补录 src/docs-migrate.js（lint module-map 覆盖硬校验） |
| 修改 | .sillyspec/docs/sillyspec/scan/ARCHITECTURE.md | 执行期锚点自动跟随（另一会话在途文件行号漂移，docs check --fix 重锚，非手改内容） |
| 修改 | .sillyspec/docs/sillyspec/scan/TESTING.md | 同上（锚点自动跟随） |

## 接口定义

```js
// src/docs-check.js 新增导出
export function isExemptDoc(relPath, mdText) // → boolean（路径段 archive/finished 或 frontmatter doc_type: snapshot）
// runDocsCheck opts 增: exempt?: boolean（默认 true→豁免开）
// runDocsCheck 返回增: skippedExempt: number, skippedFuzzy: number
// invalid[].fix 增可选: candidates: Array<{file: string, line?: number}>（机械候选，无置信度）

// src/docs-migrate.js
export function planDocsMigrate({ projectRoot, from, to, docs?, paths?, skip? })
// → { plans: Array<{doc, docLine, ref, newRef, verified: boolean}>, scanned: number }
export function runDocsMigrate({ projectRoot, from, to, apply = false, ... })
// → { plans, applied, skipped, unverified, postCheck?: {invalid: number, total: number} }
```

生命周期契约：无/不涉及生命周期契约。

## 数据模型

无表结构变更。`--json` 输出新增字段（skippedExempt/skippedFuzzy/fix.candidates）只增不减。

## 兼容策略

- 未配置/未传新 flag 时：`docs check` 豁免默认生效（唯一默认行为变化，方向为 invalid 只减不增）；stdout/stderr 通道分配变化（FR-5：报告内容改走 stdout，文本逐字不变）；其余输出逐字不变
- 默认行为变化两处均朝降噪：①括号路径从「截断误报」变「真实校验」；②archive/finished/snapshot 文档退出计数。dogfood 基线 .sillyspec/docs-check-baseline 收尾时复核下调
- 旧 `docs migrate`（结构迁移）入口保留：无 --from/--to 时行为不变
- 回退路径：豁免可 --no-exempt 关闭；migrate 不 --apply 零写盘

## 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | REF_RE 展开循环形对存量文档提取面变化（新匹配括号路径） | P1 | 全仓 docs check 前后对账（total 数对比），异常漂移即回退正则 |
| R-01b | 展开循环形残留 ReDoS 路径（Grill 已验证线性，但正则语义变更属高危面） | P1 | Grill 压测记录（n=30 0.01ms）+ 单测 evil 用例锁死（长 token 无 :N） |
| R-02 | 豁免默认开改变 invalid 计数，gate 基线失配 | P1 | 收尾跑 docs check 实测并 --init-baseline 下调（invalid 只减不增，无拦截风险） |
| R-03 | migrate from/to 写反造成大面积错误替换 | P0 | 默认 dry-run + 每目标 resolveCandidates 验证 unverified 警示 + 不自动 --apply |
| R-04 | 括号路径在 Windows/跨平台文件系统合法性 | P2 | `( )` 在 NTFS/ext4/APFS 均合法字符；existsSync/join 天然支持，测试覆盖 |
| R-05 | 顿号/全角标点未来被误扩进字符集致引用粘连 | P2 | 回归测试锁死字符集排除全角标点断言 |

## 决策追踪

| 决策 | 覆盖点 | 状态 |
|---|---|---|
| D-001@v1 范围=五项摘果子 | 非目标、总体方案 | 已覆盖 |
| D-002@v1 migrate 确定性语义 | 总体方案 Phase 2、R-03 | 已覆盖 |
| D-003@v1 豁免双通道 | 总体方案 Phase 1（FR-3）、接口定义 isExemptDoc | 已覆盖 |
| D-004@v1 薄新模块复用提取器 | 文件变更清单（docs-migrate.js 行）、总体方案 Phase 2 | 已覆盖 |
| D-005@v1 报告出口统一 stdout | 总体方案 Phase 1（FR-5）、文件清单 index.js 行、兼容策略 | 已覆盖 |
| D-006@v1 REF_RE 展开循环形（Grill 否决原子序列形 ReDoS） | 总体方案 Phase 1（§3.1）、R-01b | 已覆盖 |

## 自审（Self-Review)

- 章节齐全：背景/目标/非目标/拆分/方案/清单/接口/兼容/风险/决策/自审 ✓；frontmatter ✓；生命周期豁免短语 ✓
- 依据核对：REF_RE/resolveCandidates/classifyFix/applyFixes/runDocsCheck/CLI 分派均有行号锚点（设计讨论稿 §2 表），无凭空设计
- 测试计划补 FR-5：子进程断言非 JSON 失败输出进 stdout、stderr 仅剩 ⚠️ 行（FR-5 属 index.js 通道调整，不进 docs-check.js 单测）
- Design Grill 复审结论落点（2026-09-08）：P0 ReDoS 阻断 → D-006 展开循环形修订 + R-01b 压测要求；P1 测试文件遗漏 → 清单补 test/docs-check-fix.test.mjs；P1 migrate exit code 缺失 → Phase 2 段补契约。次要 gap 全部成文：嵌套 ((x)) 部分提取、gate 零改动面、豁免与 skip 正交/显式点名同豁免、frontmatter 机械匹配边界、FR-4 candidates 限定带 / 路径。
- ⚠️ 自审存疑：旧 `docs migrate`（结构迁移）与新语义共用命令名，靠 flag 有无分流——若历史脚本裸跑 `docs migrate` 语义不变（兼容），但 help 文本需写清两种形态
- ⚠️ 自审存疑：豁免范围 `archive/` 段匹配 `.sillyspec/changes/archive/` 下文档——该目录不在 DEFAULT_DOC_PATHS（docs/ + .sillyspec/docs/），实际不触发；平台仓 `docs/sillyspec/finished/` 在扫描面内会豁免（符合预期）
- YAGNI 复核：无置信度、无交互模式、无新门控语义，与 D-001 边界一致
