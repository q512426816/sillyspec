---
author: qinyi
created_at: 2026-09-14 03:19:07
generated_by: sillyspec-fourpiece-init
---
# 需求规格（Requirements）

## 角色
| 角色 | 说明 |
|---|---|
| agent（主控） | 调用 `sillyspec scan refresh` 获取工单，按工单手术编辑 scan 文档，调 `--done` 收尾盖章 |
| CLI（sillyspec） | 算差异事实、门控、渲染工单、盖章推进基线、跑 postcheck、落审计 |
| 多 agent 并行会话 | 同仓他者会话：guard 互斥语义的消费方（run scan 重写 guard 接管会话态） |

## 功能需求

### FR-1: 写面限界——refresh 只写 7 份 scan 文档
Given 项目已有 scan 产物（7 文档 + _module-map.yaml + modules/*.md + knowledge/）
When 执行 `scan refresh` 与 `scan refresh --done` 全流程
Then 写面仅限 `docs/<project>/scan/` 下 7 份文档、`_facts.md`（重跑）、`.runtime/scan-guard.json`（握手）与 `.runtime/scan-refresh-<ts>.json`（审计）；modules/、knowledge/、glossary 零写入

### FR-2: 第①拍只读出工单
Given scan 文档带 source_commit 基线且门控全过
When `sillyspec scan refresh`
Then 输出手术工单：每受影响文档一节（过时引用清单 A/D/M/R 标注 + 相关 hunks ≤200 行 + 基线后 commit messages ≤30 条 + 编辑纪律）；退出码 0

### FR-3: 第②拍盖章闭环（含内容比对门）
Given agent 已按工单完成定点编辑
When `sillyspec scan refresh --done [--docs A.md,B.md]`
Then 逐文档比对 ①拍 guard 记录的内容 sha256——未变者默认不 bump（打印「未编辑即盖章」提示，显式 --docs 点名或 --force 才推进）；有变者推进 source_commit→HEAD、updated_at→now、generator→sillyspec-scan-refresh（其余 frontmatter 键与其余文档不动）；复跑 runScanPostCheck（specDir=platformOpts?.specRoot||null 转换后传入）；审计落盘（平台模式经 resolveRuntimeRoot 定根）；bump 幂等（重跑同值无害）

### FR-4: 多文档异基线聚合=落后最多（scan-diff 与 scan-staleness 统一）
Given scan 目录内各文档 source_commit 不一致（增量刷新后常态）
When `sillyspec scan diff`（无 --base）或 staleness 注入计算
Then 基线聚合=全文档收集 source_commit → 去重基线逐个 rev-list --count 取**落后最多**者（拓扑序，免疫 rebase/amend 日期倒挂；fail-soft 回退首个命中）；scan-staleness 同口径（堵「任一文档 break 首个命中」的 readdirSync 顺序随机失真）；存量同批同值场景输出与旧版一致

### FR-5: 门控——三硬门 + 软门 + dirtyCheck fail-closed
Given 任一条件：①scan 文档无 source_commit；②基线非 HEAD 祖先；③受影响文档含 scan_depth: quick；④in-scope 路径有未提交改动（scope 空=全仓源码面回退，排除 .sillyspec/node_modules/dist/build/.git）
When `sillyspec scan refresh`
Then ①-④拒绝（**四类 --force 均不可越**；④提示提交后重试或全量 scan）；软门（scope 过滤后漂移>100 文件或 behindCommits>200）告警建议全量且 --force 可继续；受影响集变更集口径=全量变更集（不经 scope 过滤，staleRefs 同语义）

### FR-6: 检出极限如实声明
Given refresh 全流程任意输出面（help/工单/审计/--done 报告）
When 渲染任何结论性文案
Then 不含「文档与源码一致」断言，只称「核对至 HEAD 的检出项已处理」；scan-staleness advisory 注入行为零改动

### FR-7: guard 握手与 7/40 位错配修复
Given worktree-guard hook 已安装的宿主
When refresh ①拍完成 → agent 编辑白名单内 scan 文档 → refresh --done
Then 编辑不被 hook 拦截（guard mode='scan-refresh' + refreshDocs 白名单前置分支）；白名单外 scan 文档保护不放松；存量 guard（无 mode 字段）行为逐字节不变；guard check-1 比对归一 7 位（同基线放行/异基线拦截——修复现 7 vs 40 恒拦存量 bug）

### FR-8: 工单材料体积上限
Given 基线后变更量巨大
When 渲染工单
Then hunks 每文档 ≤200 行、commits ≤30 条，超限降级为提示 agent 自行 `git diff`（不撑爆上下文）

## 非功能需求
- 兼容性：未跑 refresh 时 scan diff/staleness/主流程 scan 行为零改动；hook 变更为加法扩展；非 git 仓 fail-soft 拒绝（kind=git-error）不抛裸异常
- 跨平台：Windows/Linux/macOS（safeGit/POSIX 路径归一/原子写沿用既有模式）
- 多 agent：--done 写面最小 + 幂等；审计文件时间戳不互踩

## 决策覆盖矩阵（如存在 decisions.md）
| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001@v1 | FR-1 | 写面限界（复潮边界记录） |
| D-002@v1 | FR-2, FR-3 | 两拍交互形态 |
| D-003@v2 | FR-4, FR-7 | per-doc bump + 三消费方对齐（supersede v1） |
| D-004@v1 | FR-5 | 脏工作区 fail-closed |
| D-005@v1 | FR-5 | 三硬一软回退门 |
| D-006@v1 | FR-6 | 检出极限声明 |
| D-007@v1 | FR-3, FR-7 | guard 握手 + 7/40 修复 |
| D-008@v1 | FR-5 | 三处 scope 口径 |
| D-009@v1 | FR-3, FR-4, FR-5 | 聚合键落后最多 + 内容比对门 + finalize specDir 口径 |
