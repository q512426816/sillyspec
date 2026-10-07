---
author: flow-machine-draft
created_at: 2026-10-07T15:19:41.073Z
---
# 决策记录（Decisions）— 2026-10-07-scope-audit-thin-patch-replay

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：patch 段解析与 git 真实 numstat 的口径偏差（路径含空格的引号形态、rename 段、\ No newline 标记）。缓解：段头正则与既有 filterPatchForFiles/slicePatchForFile 同款（b/ 新路径），\ 开头续行不计，rename 场景 thin 冻结面罕见且行数偏差不改变三态判定；测试对拍 buildFrozenPatch 产物。放弃的方案：① flow done 补写 scope-audit.json（写侧）——只救新变更救不了存量归档，且造双冻结源；② 行数按 meta.baseline..head 提交区间改采 git numstat——对 committed 面精确但冻结面含 done 时点工作树件（治理工件/untracked），且引入对 git 对象库存活的依赖，不如解析冻结 patch 自包含。
