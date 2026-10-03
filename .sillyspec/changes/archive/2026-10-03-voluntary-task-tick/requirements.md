---
author: flow-machine-draft
created_at: 2026-10-03T06:48:48.936Z
---
# 需求规格（Requirements）— 2026-10-03-voluntary-task-tick

## 功能需求（GWT 骨架已机器预填——可编辑覆盖；FR 进知识索引）

<!--AGENT:FR区 agent 填写功能需求（GWT 骨架已预填——覆盖/修改/保留均可） -->
### FR-01: 轻量勾选动词 task tick：sillyspec task tick --change <名> --task task-NN 翻格幂等（已勾再勾不报错），输出已勾进度 N/M 与下一待办任务指针，未知 task-NN 报错并列可选 id
Given 幂等 相关模块就绪
When 轻量勾选动词 task tick：sillyspec task tick --change <名> --task task-NN 翻格幂等（已勾再勾不报错），输
Then 行为符合本条标准描述

### FR-02: flow start 执行循环文案改第一人称时序「做一件→测试绿→当场勾一格→下一件」，点名 harness TodoWrite 类工具不替代 tasks.md（进度源唯一），并给出 tick 动词用法
Given 测试 相关模块就绪
When flow start 执行循环文案改第一人称时序「做一件→测试绿→当场勾一格→下一件」，点名 harness TodoWrite 类工具不替代 tasks.md
Then 行为符合本条标准描述

### FR-03: tasks.md 机器稿头注（flow-draft 源）同步该时序与 tick 用法
Given 系统就绪
When tasks.md 机器稿头注（flow-draft 源）同步该时序与 tick 用法
Then 行为符合本条标准描述

### FR-04: AGENTS.md 核心规则新增边干边勾常驻条目（init 模板源如在场则同步）
Given 系统就绪
When AGENTS.md 核心规
Then 新增边干边勾常驻条目（init 模板源如在场则同步）

### FR-05: flow done 勾选缺失 advisory 去掉「区间有提交」前提：全未勾零提交也显形（不阻断）
Given 系统就绪
When flow done 勾选缺失 advisory 去掉「区间有提交」前提：全未勾零提交也显形（不阻断）
Then 行为符合本条标准描述

### FR-06: 任务面仍为机器镜像稿且全未勾时 done 机器代勾全部镜像行（autopilot_ticked 留痕、可辨代勾来源），不拒收
Given 系统就绪
When 任务面仍为机器镜像稿且全未勾时 done 机器代勾全部镜像行（autopilot_ticked 留痕、可辨代勾来源），不拒收
Then 行为符合本条标准描述

### FR-07: 新增聚焦测试：task tick 直测（幂等/指针/未知 id）+ done advisory 与代勾行为测
Given 测试 / 幂等 相关模块就绪
When 新增聚焦测试：task tick 直测（幂等/指针/未知 id）+ done advisory 与代勾行为测
Then 行为符合本条标准描述

### FR-08: 既有测试回归绿
Given 测试 相关模块就绪
When 既有测试回归绿
Then 行为符合本条标准描述

## 测试绑定（每条 FR 至少一行——空槽将在 flow done 时自动从测试结果补全）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/task-tick.test.mjs「①a 翻格保字节」「①b 幂等」「①c 未知 id」「③a task tick：翻格+进度回显+下一任务指针」

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/batch-tick-gate.test.mjs「③ A 层文案钉」（执行循环（边干边勾，自愿纪律）／task tick 用法／TodoWrite 点名三钉）

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/batch-tick-gate.test.mjs「③ A 层文案钉」（flow-draft 头注定稿与硬门钉）+ test/tick-loop-nudge.test.mjs「② tasks.md 头部纪律行钉」

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
不适用：模板与仓实例的规则 13 是静态文档行，无行为面——由 FR-02/03 的文案钉机制同族背书（grep 面在 AGENTS.md/templates/agents-instruction.md，测试断言文档行属钉死文档脆断言，不为静态 md 加测）

<!--AGENT:测试绑定FR-05 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/task-tick.test.mjs「⑤ 认领未勾完（覆写面）→ advisory 不代勾不阻断；零提交也显形」+ test/flow-tick-prototype.test.mjs「④ 勾选缺失 advisory」

<!--AGENT:测试绑定FR-06 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/task-tick.test.mjs「④ 镜像未认领+有交付 → 机器代勾全部镜像行（不阻断、留痕、归档件全勾）」

<!--AGENT:测试绑定FR-07 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/task-tick.test.mjs 全 9 测（①②③ 纯函数与 CLI + ④⑤ done 行为）

<!--AGENT:测试绑定FR-08 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/task-tick.test.mjs 同跑回归面：flow-tick-prototype / tick-loop-nudge / governance-autopilot / sentinel-mirror-waiver / batch-tick-gate / sentinel-wiring / sentinel-rules / flow-draft / flow-status-heartbeat（92/92 绿）
