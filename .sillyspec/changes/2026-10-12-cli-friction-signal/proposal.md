---
author: flow-machine-draft
created_at: 2026-10-12T13:41:49.756Z
---
# 提案书（Proposal）— 2026-10-12-cli-friction-signal

## 动机

任务原话转写：dogfood 实证驱动（fire-equipment 会话复盘·子代理A/B取证）：a) deps 门控阻断首条只有标题无明细（13s 后重试才见原因），且缺 meta.json 路径与正规逃生口——agent 最终两次手改 CLI 内部 meta.json 才过门；b) 哨兵拒收不声明扫描面（扫的是哪个仓的 baseline..HEAD），跨仓交付的 agent 靠猜；c) 在已登记跨仓的子仓目录跑 CLI，未初始化门只给 git root 锚点不给工作区指路——三连「CLI 跑错目录」靠人工发现。

成功标准：
- deps 门控阻断输出一次给全（run/gates.js 主仓与跨仓两分支）：depsStatus/depsError 尾部/meta.json 路径三要素齐 + 正规逃生口行（worktree doctor --fix 与 run execute 重供给）+ 明示「勿手改 meta.json（doctor 以实态校正）」——报错即自足，无需二跑定位
- 哨兵拒收文案（flow.js detectFakeCheckCompletion 拒收处）声明证据扫描面：工作区仓 git log baseline..HEAD + change 目录内 review.json；跨仓交付指引一行（跨仓提交不在扫描面，须在本仓提交消息带 task-NN 或产 review.json）
- register-repo 写跨仓标记：registerRepoInLocalYaml 成功后 best-effort 向 <仓根>/.git/sillyspec-crossrepo.json 写 {workspace,key,registeredAt}（.git 内零工作区污染；写失败仅告警不影响注册）；resolveUninitCwdGate block 态读标记，index.js 未初始化门文案追加精确指路（「此仓已登记为工作区 <路径> 的跨仓「<key>」——请回该工作区运行或 --dir 指定」）；无标记时文案与现状逐字一致
- 新增单测：deps 阻断输出三要素断言（现有 harness 夹具族）/ 哨兵文案扫描面行 / 标记写入与幂等 / 带标记 uninit 门精确指路 / 无标记零变化

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. deps 门控阻断输出一次给全（run/gates.js 主仓与跨仓两分支）：depsStatus/depsError 尾部/meta.json 路径三要素齐 + 正规逃生口行（worktree doctor --fix 与 run execute 重供给）+ 明示「勿手改 meta.json（doctor 以实态校正）」——报错即自足，无需二跑定位
2. 哨兵拒收文案（flow.js detectFakeCheckCompletion 拒收处）声明证据扫描面：工作区仓 git log baseline..HEAD + change 目录内 review.json；跨仓交付指引一行（跨仓提交不在扫描面，须在本仓提交消息带 task-NN 或产 review.json）
3. register-repo 写跨仓标记：registerRepoInLocalYaml 成功后 best-effort 向 <仓根>/.git/sillyspec-crossrepo.json 写 {workspace,key,registeredAt}（.git 内零工作区污染；写失败仅告警不影响注册）；resolveUninitCwdGate block 态读标记，index.js 未初始化门文案追加精确指路（「此仓已登记为工作区 <路径> 的跨仓「<key>」——请回该工作区运行或 --dir 指定」）；无标记时文案与现状逐字一致
4. 新增单测：deps 阻断输出三要素断言（现有 harness 夹具族）/ 哨兵文案扫描面行 / 标记写入与幂等 / 带标记 uninit 门精确指路 / 无标记零变化

## 成功标准（可验证）

1. deps 门控阻断输出一次给全（run/gates.js 主仓与跨仓两分支）：depsStatus/depsError 尾部/meta.json 路径三要素齐 + 正规逃生口行（worktree doctor --fix 与 run execute 重供给）+ 明示「勿手改 meta.json（doctor 以实态校正）」——报错即自足，无需二跑定位
2. 哨兵拒收文案（flow.js detectFakeCheckCompletion 拒收处）声明证据扫描面：工作区仓 git log baseline..HEAD + change 目录内 review.json；跨仓交付指引一行（跨仓提交不在扫描面，须在本仓提交消息带 task-NN 或产 review.json）
3. register-repo 写跨仓标记：registerRepoInLocalYaml 成功后 best-effort 向 <仓根>/.git/sillyspec-crossrepo.json 写 {workspace,key,registeredAt}（.git 内零工作区污染；写失败仅告警不影响注册）；resolveUninitCwdGate block 态读标记，index.js 未初始化门文案追加精确指路（「此仓已登记为工作区 <路径> 的跨仓「<key>」——请回该工作区运行或 --dir 指定」）；无标记时文案与现状逐字一致
4. 新增单测：deps 阻断输出三要素断言（现有 harness 夹具族）/ 哨兵文案扫描面行 / 标记写入与幂等 / 带标记 uninit 门精确指路 / 无标记零变化
