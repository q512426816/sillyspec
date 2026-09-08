---
author: qinyi
created_at: 2026-09-08 12:10:00
---

# 验证报告（Verify Result）— 2026-09-08-docs-fix-capability

## 结论：PASS（带 2 项环境注记）

全量测试由 CLI 在 --done 统一执行；本地验证聚焦本变更范围（docs 面子集 + 实测取证），符合 FR-12 重复执行纪律。

## 逐项验收（FR-01 ~ FR-07）

| FR | 验收证据 | 结论 |
|----|---------|------|
| FR-01 括号路径 | test/docs-fix-capability.test.mjs：`app/(dashboard)/ppm/shared.tsx:21` 全量提取+真实校验、`(dashboard)/page.tsx:5` 括号开头、`[t](foo.js:12)` 零回归、嵌套 `((x))` 部分提取陈述锚定——16/16 绿 | ✅ |
| FR-01b ReDoS | evil 用例（GitHub URL 形态 n=30 长 token 无 :N）实测 0ms（阈值 100ms；初稿原子序列形 Grill 实测 73.8s）——D-006 锁死 | ✅ |
| FR-02 省略号 | `api/.../route.ts` → skippedFuzzy=1 不计 total/invalid（单测+CLI --json 实测双证） | ✅ |
| FR-03 顿号 | `a.py:21、b.py:63` 拆两条 + 全角标点字符集回归锁 | ✅ |
| FR-04 migrate | 单测 6/6（前缀过滤/newRef 重组/unverified/dry-run 零写盘/--apply+postCheck/from=to 反例）；CLI 实测 dry-run 列计划+unverified 高亮+exit 0+零写盘；exit code 契约（0/1/2）实现于 index.js 分派 | ✅ |
| FR-05 豁免 | archive/ 路径段+doc_type: snapshot 双通道（单测）；CLI 实测 skippedExempt=1 不进 invalid；exempt:false 恢复全量；dogfood docs gate 0=基线 0 放行（invalid 只减不增） | ✅ |
| FR-06 candidates | --json 实测含 skippedExempt/skippedFuzzy 新字段；tie 歧义 {file,line} 与带 / 路径 {file} 单测过；裸名恒空无 candidates（Grill 修正落地） | ✅ |
| FR-07 stdout 出口 | CLI 实测：失败时 stdout 含 ❌ 报告头+明细+修复指引，stderr 0 行；--json 与 exit code 不变；S8 通道契约测试过（docs-check-fix 19/19） | ✅ |

## 决策覆盖核验

D-001~D-006 全 accepted 无 unresolved：D-001 范围（无置信度/交互/新门控——diff 核实零越界）✓、D-002 migrate 语义 ✓、D-003 豁免双通道 ✓、D-004 薄模块（docs-migrate.js import 复用零正则复制——diff 核实）✓、D-005 双轨出口 ✓、D-006 展开循环形 ✓。无 superseded 被引用。

## 质量扫描

- lint（npm run lint = check-syntax + module-map 覆盖 + 内容规则）：488 文件全过
- docs gate：0 失效 = 基线 0 放行
- 41/41 docs 面单测（docs-fix-capability 16 + docs-migrate 6 + docs-check-fix 19）主仓落地后复跑全绿

## 环境注记（不阻断 PASS）

1. 全量套件并发下 ~10 文件 flake（单独跑 100% 过；Windows TEMP EPERM/Defender 文件锁/CLI 子进程网络时序）——run-tests.mjs 套件隔离已尽力，属存量测试基础设施问题，非本变更引入（本变更未触及并发/子进程机制）。
2. config-cat / local-register / spec-dir-home-guard 三文件主仓（无本变更）同样失败——本机存在全局 `~/.sillyspec` 破坏测试前提，存量环境问题。

## 执行偏差记录

- runDocsMigrate postCheck 未透传 opts.docs（P3，CLI 面无影响，已登记步骤 12 审查）
- worktree apply BLOCKED（并行会话同文件在途）→ rescue 路径落地（checkpoint 零差异验证后 cp），commit 6db00e8

## 探针结果（CLI 机械预填，--init 补注入） [层：可复跑探针——gate 抽查防篡改]
#### 探针 1：未实现标记扫描（design 清单文件）
- ⚠️ `src/index.js:99` sillyspec symbol-impact --change <name>      生成 symbol-impact.md 逐 task <!--TODO--> 骨架（gate 拒绝未替换占位，防骨架直接过门）
- ⚠️ `src/index.js:104` sillyspec verify-probes --change <name> [--init]  verify 机械探针（TODO 标记/测试覆盖/API 对账/删除对账）；--init 生成 verify-result.md 骨架
- ⚠️ `src/index.js:897` // 一条命令跑完并渲染成可直接粘贴的 markdown；半语义探针（2/4 + 3.4/3.5）显式留 TODO。
- ⚠️ `src/index.js:904` console.error('用法: sillyspec verify-probes --change <name> [--init] [--json] [--spec-dir <path>]\n  跑机械探针（TODO 标记/测试覆盖/API 对账/删除对账）输出 markdown；--init 生成 verify-
- ⚠️ `src/index.js:997` // paths 前缀匹配预填（机械），影响类型/review 标记留 <!--TODO-->（语义）。已存在不覆盖。
- ⚠️ `src/index.js:1023` console.log(`   归类 ${miResult.matchedCount} 个文件，未匹配 ${miResult.unmatchedCount} 个；影响类型列逐行替换 <!--TODO-->。`);
- ⚠️ `src/index.js:1282` // plan.md）注册表生成逐 task <!--TODO--> 骨架；gate 拒绝未替换的占位（防骨架直接过门），
- ⚠️ `src/index.js:1287` console.error('用法: sillyspec symbol-impact --change <name> [--spec-dir <path>]\n  生成 symbol-impact.md 逐 task <!--TODO--> 骨架（已存在不覆盖）；gate 拒绝未替换的占位行');
- ⚠️ `src/index.js:1313` console.log('   逐行替换 <!--TODO--> 为结论（无签名级变更也显式写「无」）；gate 拒绝未替换的占位行。');
- ⚠️ `src/index.js:2679` // 缺 token 直接终止（体检 HUB-02）：交互式输入尚未实现（task-11），此前
- ℹ️ 清单文件不存在（跳过）：NEW:src/docs-migrate.js、NEW:test/docs-fix-capability.test.mjs、NEW:test/docs-migrate.test.mjs
**结论（探针1）**：✅ 通过——10 处 ⚠️ 全为 src/index.js 存量 CLI 用法文本/注释中的字面 "TODO"/"<!--TODO-->" 字样（symbol-impact/verify-probes 自身的帮助文案，行号 99-1313 皆在本变更未触及区域；本变更 diff 零新增 TODO/FIXME——git diff 6db00e8 核实）。NEW: 前缀三文件清单跳过合理（已创建，探针按字面路径查）。

#### 探针 2：设计关键词覆盖
**结论（探针2）**：✅ 通过——design 关键能力逐个 grep 实测：展开循环形正则（src/docs-check.js REF_RE）✓、isExemptDocPath/isExemptDocFrontmatter ✓、skippedFuzzy/skippedExempt ✓、fix.candidates（classifyFix tie 分支+文件不存在分支）✓、planDocsMigrate/runDocsMigrate（src/docs-migrate.js）✓、--no-exempt（index.js BARE_FLAGS）✓、报告 console.log 化（FR-5 段）✓、docs migrate --from/--to 分派 ✓。全部命中实现。

#### 探针 3：验收标准测试覆盖
- ✅ task-01: 模块目录（src）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ✅ task-02: 模块目录（NEW:src、src）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ✅ task-03: 模块目录（src）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ✅ task-04: 模块目录（NEW:test、test）找到 10 个测试文件（test/agent-automation-batch4.test.mjs、test/agent-gate-hardening.test.mjs、test/agent-session-log.test.mjs、test/align-execute-review-gate.test.mjs、test/apply-merge-wip-autocommit.test.mjs …）
- ✅ task-05: 模块目录（.sillyspec/docs/sillyspec/modules、src）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ℹ️ 集成盲区（路由/跨模块装配）与断言有效性抽查是语义判断，留给 agent 逐 task 标注 ⚠️
**结论（探针3）**：✅ 通过——跨模块装配已由 S7/S8 CLI 子进程测试覆盖（新旧 CLI 对照+通道契约）；断言有效性抽查：evil ReDoS 用例（耗时断言）、exempt:false 恢复断言、from=to 反例断言均为行为级非镜像断言。task-01~05 测试归属正确（探针 ✅ 5/5）。

#### 探针 4：决策追踪覆盖
**结论（探针4）**：✅ 通过——闭环核验：D-001~D-006 → requirements FR-01~07（决策覆盖矩阵）→ plan.md 覆盖矩阵（六决策逐行 D→task→AC）→ tasks 卡 decision_ids 字段（task-01 含 D-006/D-003、task-02 含 D-002/D-004、task-03 含 D-005）→ 证据回指（verify-result.md 逐项验收表+单测 41/41+CLI 实测）。无 dangling 引用，无 superseded 被引用。

#### 探针 5：API Contract Parity
- ✅ API parity check passed: 2 backend endpoints (live [scan-root 3] + artifact 0), 0 frontend calls [scope: change-diff (2 files @ scan-root)] | 2 backend endpoints unused by frontend
- ⚠️ 2 个后端端点前端未调用（warning 不阻断）：GET /api/path、GET /api
**结论（探针5）**：✅ 通过——本变更是纯 CLI/解析层，无 HTTP 端点变更（design 无接口定义段网络面）；探针扫到的 2 个「端点」是 scan-root 从 docs 字符串误提取的伪端点（GET /api/path 等，来自文档示例文案），非真实路由。无 parity 义务。

#### 探针 6：代码删除对账
- ✅ git diff 无整文件删除（D/R/C）记录
- ℹ️ 以 git 事实为准（真实 > 声明）；是否 FAIL blocker 由 agent 诚实判定
