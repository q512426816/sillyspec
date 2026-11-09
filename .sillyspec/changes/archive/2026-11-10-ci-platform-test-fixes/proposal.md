---
author: flow-machine-draft
created_at: 2026-11-09T16:31:07.483Z
---
# 提案书（Proposal）— 2026-11-10-ci-platform-test-fixes

## 动机

任务原话转写：修复 CI 两个测试平台差异失败

动机与背景：main 分支 GitHub Actions test job 连续多轮红（run 42585092831：908 过/2 失败），两例均为 Windows 本地绿、Linux CI 红的平台差异：(1) fr-regress-cap ③ 无条件读仓根 .sillyspec/local.yaml，该文件属 gitignored 机器本地配置、CI checkout 不存在 → ENOENT；(2) eval-knowledge-runner Test9 重复标签用例夹具用单字标签 x 拼 join(root,path)，POSIX 下拼出 x:/home/... 撞上 parseRepoSpec 的 Windows 盘符分支，标签被解析成 basename（a/b）不再冲突故不抛错。

成功标准：
- 两用例改为平台无关后本地 Windows 复跑全绿（fr-regress-cap 3/3、eval-knowledge-runner 39/39）
- POSIX 逻辑推演：local.yaml 缺失走条件跳过分支、重复标签走非盘符分支照常抛错——GitHub Actions test job 转绿

## 变更范围

按成功标准机械推导，共 2 条验收面：
1. 两用例改为平台无关后本地 Windows 复跑全绿（fr-regress-cap 3/3、eval-knowledge-runner 39/39）
2. POSIX 逻辑推演：local.yaml 缺失走条件跳过分支、重复标签走非盘符分支照常抛错——GitHub Actions test job 转绿

## 成功标准（可验证）

1. 两用例改为平台无关后本地 Windows 复跑全绿（fr-regress-cap 3/3、eval-knowledge-runner 39/39）
2. POSIX 逻辑推演：local.yaml 缺失走条件跳过分支、重复标签走非盘符分支照常抛错——GitHub Actions test job 转绿
