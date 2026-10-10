---
author: flow-machine-draft
created_at: 2026-10-10T11:04:18.181Z
---
# 设计记录（Design Record）— 2026-10-10-repo-inline-worktree-placement

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

2026-10-10-cross-worktree-toolchain 交付的 `worktree.crossPlacement` 独立段被用户反馈配置形态重：落位与仓注册分居 local.yaml 两处。本变更把落位内联到注册条目上——`repos.<key>` 支持对象形态 `{path: <仓根>, worktree: <落位根>}`（块式/inline flow 双写法），字符串形态零回归。落位解析内核 `_parseRepoEntries` 统一三形态（字符串值即 path / inline 对象取子键 / 块式子键块整块消费防 'path'/'worktree' 键名污染 Map），`parseRepoRegistry` 的 Map 值语义不变（13 个消费文件零改动），新增 `parseRepoWorktreePlacements` 导出读 worktree 子键。落位优先级 repos 内联 > crossPlacement（legacy 兼容保留，config-schema 标注推荐迁移）> 默认公式。两个手写旁路解析（worktree-guard analyzeCrossRepoCd 的 cd 纠偏、worktree-deps registeredRepoRoots 的越界豁免集合）同步升级对象形态——guard 取 path 子键、deps 只收 path 值防 worktree 落位根混入豁免面。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `parseRepoRegistry(yamlText)` 签名与返回类型不变（`Map<repoKey, path>`），行为扩展：对象条目取 path 子键；新增导出 `parseRepoWorktreePlacements(yamlText)` → `Map<repoKey, worktreeDir>`（仅对象条目）。
- local.yaml 格式扩展：`repos.<key>` 新增对象形态（`{path, worktree}`，块式/inline）——字符串形态语义不变；`worktree.crossPlacement` 键保留（legacy），新增优先级关系 repos 内联 > 该键 > 默认。
- `ensureCrossWorktrees` 落位源接入内联优先级；`analyzeCrossRepoCd`（src/hooks/worktree-guard.js）与 `registeredRepoRoots`（src/worktree-deps.js，未导出内部 IIFE）行为扩展支持对象形态。CLI 命令面无变化。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `parseRepoRegistry(yamlText)` 签名与返回类型不变（`Map<repoKey, path>`），行为扩展：对象条目取 path 子键；新增导出 `parseRepoWorktreePlacements(yamlText)` → `Map<repoKey, worktreeDir>`（仅对象条目）。
- local.yaml 格式扩展：`repos.<key>` 新增对象形态（`{path, worktree}`，块式/inline）——字符串形态语义不变；`worktree.crossPlacement` 键保留（legacy），新增优先级关系 repos 内联 > 该键 > 默认。
- `ensureCrossWorktrees` 落位源接入内联优先级；`analyzeCrossRepoCd`（src/hooks/worktree-guard.js）与 `registeredRepoRoots`（src/worktree-deps.js，未导出内部 IIFE）行为扩展支持对象形态。CLI 命令面无变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

不涉及运行时事件序：全部输入是 local.yaml 静态文本，解析为纯函数（同输入恒同输出）；配置文件被中途改写时下一次读取取新值，无缓存面。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

本变更不引入新写面（落位注册表 cross-placements.json 的读-合并-原子写沿用上一变更设计）；local.yaml 本身由用户/register-repo 命令维护，与既有并发语义一致。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

安全：解析为无状态纯函数；ensureCrossWorktrees 中断重入幂等性不受配置形态影响（meta 在即复用的短路先于落位解析）。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

不会：repos/落位配置按主仓 `.sillyspec/local.yaml` 归属，平台模式 specRoot 隔离；内联 worktree 值的解析（相对主仓根、仓根内拒绝）与 legacy 源同一套 resolvePlacementRoot，无新作用域面。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：三处手写 YAML 解析（plan-postcheck 内核、guard parseSimpleYaml 产物消费、deps 内联 IIFE）对同一对象形态的解析漂移——缓解：内核 `_parseRepoEntries` 单一事实源 + 旁路两处各自的最小升级 + 三处都有形态级测试（场景 16/17、guard-cd 既有回归、sibling-repo 既有回归）。试过但放弃的方案：直接删除 worktree.crossPlacement（未发布、干净迁移）——上一变更刚归档发号 FR-setup-083~089（knowledge/fr 已入库），删除需 supersede 对账且破坏「归档件即事实」原则；保留兼容读面零成本（readCrossPlacementConfig 已存在），优先级内联 > legacy 平滑迁移。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/stages/plan-postcheck.js | parseRepoRegistry 升级三形态内核 _parseRepoEntries + 新导出 parseRepoWorktreePlacements |
| 修改 | src/worktree-cross.js | ensureCrossWorktrees 落位双源优先级（repos 内联 > crossPlacement legacy）+ readLocalYamlText helper |
| 修改 | src/hooks/worktree-guard.js | analyzeCrossRepoCd 对象条目取 path（块式对象/inline 字符串） |
| 修改 | src/worktree-deps.js | registeredRepoRoots 块式/inline 对象形态只收 path 子键 |
| 修改 | src/config-schema.js | crossPlacement 键标注推荐迁移 + example 注释补 repos 内联样例 |
| 修改 | test/parse-repo.test.mjs | 场景 16/17：双形态解析 + 键名零污染 + 块式边界 |
| 修改 | test/cross-worktree-placement.test.mjs | 内联落位 + 优先级用例 |
