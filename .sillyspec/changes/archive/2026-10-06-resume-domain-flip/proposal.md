---
author: flow-machine-draft
created_at: 2026-10-06T13:13:33.950Z
---
# 提案书（Proposal）— 2026-10-06-resume-domain-flip

## 动机

任务原话转写：轻量变更实测发现：flow start 重入（恢复简报）的知识注入触达域会被先于变更存在的他侧未跟踪文件劫持——resume 路由面 changedFilesSinceBaseline 经 git status --porcelain 把其他会话遗留的未跟踪目录（如 .claude/skills/*）扫进来；重入时若本变更尚无提交与工作树改动，路由面仅剩这批垃圾，域被劫持成伪域 auto-*，fresh 简报从 --input 提取的真实域（如 core-engine）与相关 FR 注入在断点恢复后全部丢失——恢复时最需要上下文反而最瞎。

成功标准：
- resume 路由面 = 过滤后的基线以来文件面 ∪ --input 路径语料路由面（重入知识面 ⊇ fresh 知识面）
- 未跟踪条目「变更出生时刻之前从未写过」（最新 mtime 早于变更出生时刻；目录递归取成员最大 mtime，walk 带安全帽；stat 失败/超帽/无出生时戳保守保留）时不再进入路由面——判据是时间不是路径形态，不建路径白名单
- 变更出生时刻取进度库 changes.created_at（best-effort：无 DB/无行不过滤，行为同现状）
- fr-rot-precision ⑥ 的源码级钉（resume 复用 changedFilesSinceBaseline）保持绿
- 新增回归测试覆盖：过滤判据各分支 + 重入简报端到端（垃圾未跟踪目录不再劫持触达域、input 域恢复注入）
- npm run test:core 全绿

## 变更范围

按成功标准机械推导，共 6 条验收面：
1. resume 路由面 = 过滤后的基线以来文件面 ∪ --input 路径语料路由面（重入知识面 ⊇ fresh 知识面）
2. 未跟踪条目「变更出生时刻之前从未写过」（最新 mtime 早于变更出生时刻；目录递归取成员最大 mtime，walk 带安全帽；stat 失败/超帽/无出生时戳保守保留）时不再进入路由面——判据是时间不是路径形态，不建路径白名单
3. 变更出生时刻取进度库 changes.created_at（best-effort：无 DB/无行不过滤，行为同现状）
4. fr-rot-precision ⑥ 的源码级钉（resume 复用 changedFilesSinceBaseline）保持绿
5. 新增回归测试覆盖：过滤判据各分支 + 重入简报端到端（垃圾未跟踪目录不再劫持触达域、input 域恢复注入）
6. npm run test:core 全绿

## 成功标准（可验证）

1. resume 路由面 = 过滤后的基线以来文件面 ∪ --input 路径语料路由面（重入知识面 ⊇ fresh 知识面）
2. 未跟踪条目「变更出生时刻之前从未写过」（最新 mtime 早于变更出生时刻；目录递归取成员最大 mtime，walk 带安全帽；stat 失败/超帽/无出生时戳保守保留）时不再进入路由面——判据是时间不是路径形态，不建路径白名单
3. 变更出生时刻取进度库 changes.created_at（best-effort：无 DB/无行不过滤，行为同现状）
4. fr-rot-precision ⑥ 的源码级钉（resume 复用 changedFilesSinceBaseline）保持绿
5. 新增回归测试覆盖：过滤判据各分支 + 重入简报端到端（垃圾未跟踪目录不再劫持触达域、input 域恢复注入）
6. npm run test:core 全绿
