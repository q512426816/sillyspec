---
author: flow-machine-draft
created_at: 2026-10-03T06:48:48.935Z
---
# 提案书（Proposal）— 2026-10-03-voluntary-task-tick

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:666356c88a5716acad3788b4a05ecf92a0711ad8738310a76d76ef7ed6ddd951:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-10-03-voluntary-task-tick 留痕重锚 -->
任务原话转写：背景/动机：2026-10-03-local-usage-caliber-fix 事故复盘（平台仓）——thin 变更全程 0/12 勾选：agent 用 harness TodoWrite 替代 tasks.md 进度面；勾选指令只在 flow start 出现一次且无机器反馈；收口时区间零提交致勾选缺失 advisory 静默；平台投影失真。用户裁决：要做到边干边勾，但走自愿路径（顺手动词+即时正反馈+常驻提示），不加验证强制门（避免打回重做循环）。
成功标准：
- 轻量勾选动词 task tick：sillyspec task tick --change <名> --task task-NN 翻格幂等（已勾再勾不报错），输出已勾进度 N/M 与下一待办任务指针，未知 task-NN 报错并列可选 id
- flow start 执行循环文案改第一人称时序「做一件→测试绿→当场勾一格→下一件」，点名 harness TodoWrite 类工具不替代 tasks.md（进度源唯一），并给出 tick 动词用法
- tasks.md 机器稿头注（flow-draft 源）同步该时序与 tick 用法
- AGENTS.md 核心规则新增边干边勾常驻条目（init 模板源如在场则同步）
- flow done 勾选缺失 advisory 去掉「区间有提交」前提：全未勾零提交也显形（不阻断）
- 任务面仍为机器镜像稿且全未勾时 done 机器代勾全部镜像行（autopilot_ticked 留痕、可辨代勾来源），不拒收
- 新增聚焦测试：task tick 直测（幂等/指针/未知 id）+ done advisory 与代勾行为测；既有测试回归绿
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:6c7474261db9ae937ae3be64e7afe492a09422fe94da3bdf82d5ce77516691ee:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-10-03-voluntary-task-tick 留痕重锚 -->
按成功标准机械推导，共 8 条验收面：
1. 轻量勾选动词 task tick：sillyspec task tick --change <名> --task task-NN 翻格幂等（已勾再勾不报错），输出已勾进度 N/M 与下一待办任务指针，未知 task-NN 报错并列可选 id
2. flow start 执行循环文案改第一人称时序「做一件→测试绿→当场勾一格→下一件」，点名 harness TodoWrite 类工具不替代 tasks.md（进度源唯一），并给出 tick 动词用法
3. tasks.md 机器稿头注（flow-draft 源）同步该时序与 tick 用法
4. AGENTS.md 核心规则新增边干边勾常驻条目（init 模板源如在场则同步）
5. flow done 勾选缺失 advisory 去掉「区间有提交」前提：全未勾零提交也显形（不阻断）
6. 任务面仍为机器镜像稿且全未勾时 done 机器代勾全部镜像行（autopilot_ticked 留痕、可辨代勾来源），不拒收
7. 新增聚焦测试：task tick 直测（幂等/指针/未知 id）+ done advisory 与代勾行为测
8. 既有测试回归绿
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:2f8804820da050950951e0bd8bd94d532c0a0566ca08226139510096e4d73c1b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-10-03-voluntary-task-tick 留痕重锚 -->
1. 轻量勾选动词 task tick：sillyspec task tick --change <名> --task task-NN 翻格幂等（已勾再勾不报错），输出已勾进度 N/M 与下一待办任务指针，未知 task-NN 报错并列可选 id
2. flow start 执行循环文案改第一人称时序「做一件→测试绿→当场勾一格→下一件」，点名 harness TodoWrite 类工具不替代 tasks.md（进度源唯一），并给出 tick 动词用法
3. tasks.md 机器稿头注（flow-draft 源）同步该时序与 tick 用法
4. AGENTS.md 核心规则新增边干边勾常驻条目（init 模板源如在场则同步）
5. flow done 勾选缺失 advisory 去掉「区间有提交」前提：全未勾零提交也显形（不阻断）
6. 任务面仍为机器镜像稿且全未勾时 done 机器代勾全部镜像行（autopilot_ticked 留痕、可辨代勾来源），不拒收
7. 新增聚焦测试：task tick 直测（幂等/指针/未知 id）+ done advisory 与代勾行为测
8. 既有测试回归绿
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
