---
author: zcode-verify-friction
created_at: 2026-10-09T15:30:00+08:00
---
# 决策记录（Decisions）— 2026-10-09-verify-reuse-friction

## D-001@v1: 方案架构——单变更四 Wave（brainstorm step4 裁决存档）
- 类型：process
- 状态：confirmed
- 答案：单变更 2026-10-09-verify-reuse-friction 分四 Wave（W1 快照口径死循环+可见性 / W2 指纹树键化+观测 / W3 便宜门前移 / W4 跨仓 per-repo）。evidence：multi-agent-platform 2026-10-09 tombstone 取证（.runtime 质量扫描记录 usedSnapshot=false + 13 份 test-result + sqlite 会话命令时间线交叉归因，四机制实证独立可并行修）。放弃方案：A 五变更拆分（流程开销×5，gates.js/verify-quality-scan.js 共触文件串行依赖强）；C 只修两大头（与用户拍板的全清单不符）。

## D-002@v1: 复用指纹的代码面分量=代码树内容键（git ls-tree 过滤哈希），非 HEAD、非最近触码提交
- 类型：architecture
- 状态：confirmed
- 答案：HEAD 换 `git ls-tree -r HEAD` 按既有非代码路径口径过滤后的内容哈希；整树 oid 相同走快路径沿用上次键。纯文档提交不击穿、代码提交必击穿；git 原生对象哈希天然内容寻址，无语言/框架枚举（红线合规）。evidence：本案 13:35-14:10 五笔提交（多为纯文档）每笔击穿两类缓存实证；13:31-13:33 纯文档未提交态秒过对照。放弃方案：最近触码提交（git log 对 revert/merge/cherry-pick 语义不可靠）；mtime（非 git 事实、跨平台不可靠）；整树 oid 直接作键（文档提交也变树 oid，治不了本病——只能当快路径缓存用）。

## D-003@v1: 快照口径复用闸比对「实际口径」——先建快照后判复用
- 类型：architecture
- 状态：confirmed
- 答案：executeVerifyQualityScan 把 shouldReuseLastPassedScan 移到快照创建之后，plannedSnapshot 参数改 actualScope=Boolean(snap)。连续失败（false==false）收敛命中；口径真实切换仍失配。evidence：本案记录 usedSnapshot=false × planned=true 恒失配 → 4 轮 × 3.5min 纯浪费实证。放弃方案：快照可行性探测预判（探测与真建两套口径会再分叉）；删掉口径守卫（主仓/快照口径混用会吞真实代码差异——防作弊语义不能丢）。

## D-004@v1: 门序前移的安全边界——只移纯事实门，实测依赖门不动
- 类型：architecture
- 状态：confirmed
- 答案：仅 required-evidence 与 target_files 对账两门（纯 git/文档事实）前移到实测门前并入 R16 聚合；PASS 封顶/parity/超时降档等消费实测结果的门不动。evidence：本案 13:33 与 14:00-14:10 每轮先付 3.5 分钟实测再被对账门拦实证；两门调用链已核对无实测数据依赖。风险护栏：执行期调用链复核，发现隐藏依赖即回退该门原位记录在案。

## D-005@v1: trace 行 repo 归属 additive 字段 + 读侧回退主仓（零迁移）
- 类型：interface
- 状态：confirmed
- 答案：行新增可选 repo 字段（写侧从 task 卡 repo 切片透传），读侧按行 repo 经注册表换根，缺省 main 行为兼容存量。放弃方案：tests 路径写仓限定前缀（路径语法扩展开世界，且存量行全要迁移）；按路径猜测归属（同顶级名歧义，猜错比悬空更糟——graph-docrefs-noise D-001 同款教训）。

## D-006@v1: wt-commit 跨仓推断=注册表校验剥后缀，不猜切分
- 类型：interface
- 状态：confirmed
- 答案：cwd 推断命中 worktrees/<seg> 时，若 seg 含 `--` 且后缀命中 repos 注册表键才剥除得变更名；未注册不剥（报错引导显式 --change）。evidence：本案 index.js wt-commit 推断正则把 `<change>--<repoKey>` 整段当变更名实证。放弃方案：按最长/最后 `--` 盲切（变更名本身可含连字符，盲切会错拆主仓 worktree 名）。
