---
author: flow-machine-draft
created_at: 2026-10-13T05:12:01.570Z
---
# 提案书（Proposal）— 2026-10-13-cli-pit-fix-batch

## 动机

任务原话转写：四例 CLI 摩擦坑修复（前会话已实证写好，倒推收尾）：①FR 域路由降级告警接专用命令 tests --redomain（--from/--to/--by-change/--write 用法行 + D-001 迁域不换号铁律明示，坑 fr-redomain-advisory-and-selectivity-gap）；②worktree deps --set 显式覆写通道 + --reason 强制留痕写 meta.json（坑 deps-gate-offline-fragile 离线实证的绕过通道 CLI 化）；③stage-review 契约渲染附 review.json 完整绝对路径防子代理手拼漏阶段前缀（坑 stage-review-path-prefix）；④knowledge 子命令 --help/-h 全局拦截防 refresh 无参副作用写盘。

成功标准：
- node --test test/worktree-deps-override.test.mjs 3/3 绿（合法覆写双留痕/缺 reason exit 2/非法值 exit 2/meta 缺失 exit 1）
- sillyspec knowledge --help 输出帮助且零写盘副作用
- sillyspec tests --redomain 用法门在位（--from/--to/--by-change/--write），fr-index 降级告警引用该命令
- lint 全绿 + flow done 实测门零失败

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. node --test test/worktree-deps-override.test.mjs 3/3 绿（合法覆写双留痕/缺 reason exit 2/非法值 exit 2/meta 缺失 exit 1）
2. sillyspec knowledge --help 输出帮助且零写盘副作用
3. sillyspec tests --redomain 用法门在位（--from/--to/--by-change/--write），fr-index 降级告警引用该命令
4. lint 全绿 + flow done 实测门零失败

## 成功标准（可验证）

1. node --test test/worktree-deps-override.test.mjs 3/3 绿（合法覆写双留痕/缺 reason exit 2/非法值 exit 2/meta 缺失 exit 1）
2. sillyspec knowledge --help 输出帮助且零写盘副作用
3. sillyspec tests --redomain 用法门在位（--from/--to/--by-change/--write），fr-index 降级告警引用该命令
4. lint 全绿 + flow done 实测门零失败
