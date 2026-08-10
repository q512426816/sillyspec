---
author: qinyi
created_at: 2026-08-11T01:50:00+08:00
---

# 模块影响分析（Module Impact）— local.yaml 配置体系改造

> 变更：`2026-08-10-local-yaml-generation`（方案C revision 1）
> 分析时间：2026-08-11
> _module-map.yaml：schema_version=1（无 paths glob 字段），按文件路径手动映射模块

## 三重交叉验证

| 维度 | 来源 | 文件集 |
|---|---|---|
| 声明范围 | design.md §6 文件变更清单 | 9 源码 + 2 测试 + 文档（镜像 + file-lifecycle + skills） |
| 任务范围 | plan.md / tasks/task-01~12.md allowed_paths | 与声明一致（task-01~12 对应文件） |
| 真实变更 | git diff（rescue cp 落地 main） | 17 deliverable + docs/prompt/_extracted.json（extract 重生成） |

**以 git diff 为准**（真实 > 声明）。三者一致，无声明遗漏或夹带。

**隔离说明**：main 工作区同时含 platform-progress-sync 变更的 staged/untracked 文件（`src/run/complete-handlers.js` / `complete.js` / `test/run-complete-step-archive.test.mjs` / `.sillyspec-platform*` / `docs/sillyspec/sillyhub-progress-sync-contract.md`），**不属于本变更**，已排除（commit 时用精确 pathspec 隔离）。

## 模块影响矩阵

| 模块 | 影响类型 | 相关文件 | 更新内容摘要 | needs_review |
|---|---|---|---|---|
| cli-entry | 逻辑变更 | `src/local-detect.js` / `test/local-detect.test.mjs` | detect 核验增强：nodejs 分支读 package.json scripts 逐键核验（build/test/lint 存在才写）+ gradle 核验 gradlew 决定前缀 + JSON.parse 失败 throw 中文。消除「闭眼写死三件套」Missing script:build 实证 bug | false |
| sillyhub-mcp | 接口变更 + 新增 | `src/sillyhub-mcp/config.js`（新增）/ `src/sillyhub-mcp/client.js` | 新增 readMcpConfig 共享 helper（js-yaml 读 local.yaml mcp 段 + env fallback，best-effort 不抛不发网络）；client 构造签名加 cwd 参数，优先级链「显式 url/token > readMcpConfig(cwd) > env fallback > 空串」 | false |
| dispatch | 逻辑变更 | `src/dispatch/probe.js` / `test/dispatch/path-a-probe.test.mjs` | configFingerprint 改读 readMcpConfig(cwd)?.url（缓存 key）+ no-config 快速路径改读 readMcpConfig（保留「不发网络」保证）+ new SillyHubMcpClient 传 cwd。5 处显式构造测试零回归核验 | false |
| stages | 逻辑变更 + 配置变更 | `src/stages/{execute,scan,verify,doctor}.js` / `docs/prompt/{scan,execute,verify,doctor}.md` / `docs/prompt/_extracted.json` | execute getDispatchMode hasConfig 改 readMcpConfig + 行122/241 兜底；scan Step6 调 detect + platform/dispatch/mcp 段引导 + Step11 复查；verify 行69/167 兜底；doctor 行353 修正。镜像 extract 一致 | false |
| runtime | 配置变更 | `src/sync.js` | SyncManager.connect 写 platform 段 + mcp 段（同源假设 mcp.url/mcp.token 复用 platform），`if(!config.mcp)` 守卫保留用户已手填 mcp 段不覆盖（R-09） | false |
| 文档（跨模块） | 配置变更 | `docs/sillyspec/file-lifecycle.md` / `.claude/skills/sillyspec-execute/SKILL.md` | file-lifecycle 补 local.yaml mcp 段描述（producer=connect/agent 手填，consumer=readMcpConfig 三消费点）；execute SKILL 补 mcp 段；skills 纯净（grep 内部路径=0） | false |

## 未匹配文件

（无）—— 所有 deliverable 文件均匹配到上述模块。

## needs_review 评估

本变更涉及的 5 个模块（cli-entry / sillyhub-mcp / dispatch / stages / runtime）在 _module-map.yaml 中 **needs_review 全为 false**。本变更新增的 `src/sillyhub-mcp/config.js` 归入 sillyhub-mcp 模块目录（非根级游离文件），不触发新 needs_review=true（区别于 worktree 模块 git-helper.js 的根级待补录情况）。

模块文档（modules/*.md）本次未改动——本变更影响面已在 design.md §6 + file-lifecycle.md 充分描述，模块卡片内容仍准确（detect 核验语义 / readMcpConfig helper / connect mcp 段均为模块内行为增强，不改变模块边界）。
