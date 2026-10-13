---
author: flow-machine-draft
created_at: 2026-10-13T15:09:24.834Z
---
# 提案书（Proposal）— 2026-10-13-cross-repo-baseline-anchor

## 动机

任务原话转写：动机：thin 手工交付的跨仓对账无基线锚——collectRepoActual 四级档位里 thin 落 B 档（HEAD~1..HEAD 单笔窗口），实验实证两缺陷：多笔交付漏首笔（fire-ledger 两笔形态：实现+评审修复，B 档只看最后一笔）；交错时序下窗口完全错位（模拟里我的两笔全丢、外来的全进）。修法（可行性已实验核对）：flow start 时把各注册仓 HEAD 记入 flow-state（cross_baselines，首写者胜对齐 baseline_sha256 模式，纯读 fail-soft）；collectRepoActual 在 B 档之上加 3c 档 flow-start-baseline：窗口=基线..工作树，主面=token 归因（窗口内提交消息含变更名的提交文件并集，实验验证可精确剔除外来提交）∪ 未提交态；零 token 命中回退全窗口（并行噪音可见不静默）。透传链：flow.js 收口调用点传 st.cross_baselines → reconcileCrossRepoPlan → collectRepoActual；厚道缺省 null 走既有 A/B' 档零影响。

成功标准：
- flow start 在注册仓可达时把各仓 HEAD 记入 flow-state cross_baselines（首写者胜：重入不刷新；仓不可达/非 git fail-soft 跳过该仓不阻断 start）
- 收口对账 3c 档生效：跨仓多笔交付（两笔提交）全部进对账面（多提交盲区消除）；anchor.source 为 flow-start-baseline
- token 归因：窗口内不含变更名的外来提交被剔除（不出现在 rows）；零 token 命中回退全窗口（外来文件可见为 unplanned）
- 基线 sha 在跨仓不可达（rev-parse --verify 失败）回退既有 B 档；既有 A/B'/B/C 档行为零回归（cross-repo 既有测试零改动全绿）
- e2e：注册跨仓的变更两笔交付+untracked 收口，scopeAudit 跨仓行覆盖全部交付文件、repos[] 锚点为 flow-start-baseline

## 变更范围

按成功标准机械推导，共 5 条验收面：
1. flow start 在注册仓可达时把各仓 HEAD 记入 flow-state cross_baselines（首写者胜：重入不刷新；仓不可达/非 git fail-soft 跳过该仓不阻断 start）
2. 收口对账 3c 档生效：跨仓多笔交付（两笔提交）全部进对账面（多提交盲区消除）；anchor.source 为 flow-start-baseline
3. token 归因：窗口内不含变更名的外来提交被剔除（不出现在 rows）；零 token 命中回退全窗口（外来文件可见为 unplanned）
4. 基线 sha 在跨仓不可达（rev-parse --verify 失败）回退既有 B 档；既有 A/B'/B/C 档行为零回归（cross-repo 既有测试零改动全绿）
5. e2e：注册跨仓的变更两笔交付+untracked 收口，scopeAudit 跨仓行覆盖全部交付文件、repos[] 锚点为 flow-start-baseline

## 成功标准（可验证）

1. flow start 在注册仓可达时把各仓 HEAD 记入 flow-state cross_baselines（首写者胜：重入不刷新；仓不可达/非 git fail-soft 跳过该仓不阻断 start）
2. 收口对账 3c 档生效：跨仓多笔交付（两笔提交）全部进对账面（多提交盲区消除）；anchor.source 为 flow-start-baseline
3. token 归因：窗口内不含变更名的外来提交被剔除（不出现在 rows）；零 token 命中回退全窗口（外来文件可见为 unplanned）
4. 基线 sha 在跨仓不可达（rev-parse --verify 失败）回退既有 B 档；既有 A/B'/B/C 档行为零回归（cross-repo 既有测试零改动全绿）
5. e2e：注册跨仓的变更两笔交付+untracked 收口，scopeAudit 跨仓行覆盖全部交付文件、repos[] 锚点为 flow-start-baseline
