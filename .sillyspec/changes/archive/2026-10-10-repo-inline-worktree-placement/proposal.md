---
author: flow-machine-draft
created_at: 2026-10-10T11:04:18.180Z
---
# 提案书（Proposal）— 2026-10-10-repo-inline-worktree-placement

## 动机

任务原话转写：跨仓 worktree 落位配置 worktree.crossPlacement 独立段形态重（落位与仓注册分居 local.yaml 两处，用户反馈配置复杂）。改为 repos 段条目直接带 worktree 参数：repos.<key> 支持 {path: <仓根>, worktree: <落位根>} 对象形态，字符串形态零回归。

成功标准：
- parseRepoRegistry 双形态解析：字符串条目行为逐字节不变；对象条目（块式 key: 后缩进子键 / inline {path:.., worktree:..}）Map 值恒取 path（13 个消费文件零改动）；新增 parseRepoWorktreePlacements 导出读 worktree 子键
- ensureCrossWorktrees 落位优先级：repos.<key>.worktree > worktree.crossPlacement.<key> > 默认公式；仓根内拒绝/注册表/WSL 警告语义对两配置源一致
- hooks/worktree-guard analyzeCrossRepoCd 与 worktree-deps registeredRepoRoots 对对象形态不失效（cd 纠偏取 path；roots 集合不含 worktree 子键值）
- config-schema 文档：repos.<key>.worktree 键条目 + crossPlacement 标注兼容保留（推荐 repos 内联）
- 测试：双形态解析/优先级/旁路消费方不失效，全绿

## 变更范围

按成功标准机械推导，共 5 条验收面：
1. parseRepoRegistry 双形态解析：字符串条目行为逐字节不变；对象条目（块式 key: 后缩进子键 / inline {path:.., worktree:..}）Map 值恒取 path（13 个消费文件零改动）；新增 parseRepoWorktreePlacements 导出读 worktree 子键
2. ensureCrossWorktrees 落位优先级：repos.<key>.worktree > worktree.crossPlacement.<key> > 默认公式；仓根内拒绝/注册表/WSL 警告语义对两配置源一致
3. hooks/worktree-guard analyzeCrossRepoCd 与 worktree-deps registeredRepoRoots 对对象形态不失效（cd 纠偏取 path；roots 集合不含 worktree 子键值）
4. config-schema 文档：repos.<key>.worktree 键条目 + crossPlacement 标注兼容保留（推荐 repos 内联）
5. 测试：双形态解析/优先级/旁路消费方不失效，全绿

## 成功标准（可验证）

1. parseRepoRegistry 双形态解析：字符串条目行为逐字节不变；对象条目（块式 key: 后缩进子键 / inline {path:.., worktree:..}）Map 值恒取 path（13 个消费文件零改动）；新增 parseRepoWorktreePlacements 导出读 worktree 子键
2. ensureCrossWorktrees 落位优先级：repos.<key>.worktree > worktree.crossPlacement.<key> > 默认公式；仓根内拒绝/注册表/WSL 警告语义对两配置源一致
3. hooks/worktree-guard analyzeCrossRepoCd 与 worktree-deps registeredRepoRoots 对对象形态不失效（cd 纠偏取 path；roots 集合不含 worktree 子键值）
4. config-schema 文档：repos.<key>.worktree 键条目 + crossPlacement 标注兼容保留（推荐 repos 内联）
5. 测试：双形态解析/优先级/旁路消费方不失效，全绿
