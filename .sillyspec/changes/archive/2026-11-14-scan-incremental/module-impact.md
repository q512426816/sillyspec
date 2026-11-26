---
author: t
created_at: 2026-11-14 22:28:00
change: 2026-11-14-scan-incremental
generated_by: agent
---
# 模块影响分析（Module Impact）

> 兜底手写版：本仓（sillyspec）无 _module-map.yaml（自身从未跑过 scan——正是本变更要解的问题现场），CLI 机械预填不可用，按 gate 提示手写。文件×模块归属按源码目录结构人工判定；execute/verify 按实际 diff 回填「## 更新结果」。

## 模块影响矩阵

| 文件 | 模块归属（人工判定） | 影响类型 | 说明 |
|---|---|---|---|
| src/scan-codegraph.js | scan 增量链路（新建） | 新增 | codegraph 适配层 |
| src/scan-incremental.js | scan 增量链路（新建） | 新增 | 增量计划计算层 |
| src/stages/scan.js | scan 阶段定义 | 修改 | 四生成步骤增量注入段 |
| src/run/command.js | CLI 命令解析 | 修改 | 新 flag 登记 |
| src/run/stage.js | 阶段运行编排 | 修改 | scan 启动段探测+guard 握手 |
| src/hooks/worktree-guard.js | 写入守卫 hook | 修改 | 白名单新分支 |
| src/run/scan-profile.js | scan profile/终检 | 修改 | finalize 增量 bump 分支 |
| src/scan-facts.js | 事实抽取 | 修改 | scope 限定参数 |
| .gitignore | 仓库配置 | 修改 | 登记索引目录 |
| test/scan-codegraph.test.mjs | 测试（新建） | 新增 | 适配层单测 |
| test/scan-incremental.test.mjs | 测试（新建） | 新增 | 计算层单测 |
| test/scan-incremental-wiring.test.mjs | 测试（新建） | 新增 | 接线单测 |
| docs/sillyspec/file-lifecycle.md | 文档 | 修改 | 新运行时文件条目 |
| docs/prompt/_extracted.json | 提示词镜像 | 修改 | 机械再生 |
| docs/prompt/scan.md | 提示词镜像 | 修改 | 逐字同步 |
| .claude/skills/sillyspec-scan/SKILL.md | skill | 修改 | 增量模式说明 |

## 未匹配文件

（无 _module-map.yaml ——上表归属为人工判定；本仓跑一次 scan 生成模块索引后，后续变更可机械预填）

## 更新结果

| 模块文档 | 状态 | 备注 |
|---|---|---|
| modules/_module-map.yaml | skipped | 本仓无 module-map（自身从未跑过 scan——正是本变更要解的现场）；按文件清单人工归属已在上表，归档时随 knowledge/uncategorized 沉淀 PowerShell .ps1 shim 吞 `--` token 坑 |
