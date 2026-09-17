---
author: qinyi
created_at: 2026-09-17 11:53:15
---

# 需求规格（Requirements）

## 角色
| 角色 | 说明 |
|---|---|
| 开发者（agent） | 按 sillyspec 流程执行变更的 AI agent——封顶规则的被约束方，须按修复指引补结构化移交项或补证据 |
| 工具（CLI） | 封顶 validator、facts 管线、双门与清单注入的实现方与执行方 |
| 用户 | 变更审批点（archive Step3）的裁决人——看到 blocking/advisory 移交全貌后放行 |

## 功能需求

### FR-01: 事实面封顶（validatePassEligibility）
覆盖决策：D-001@v2, D-010@v1, D-011@v1, D-012@v1
Given verify-result 结论=PASS，且四个事实条件（①集成实测未跑 ②blocking 级 handover 行>0 ③db/*.sql 未声明执行 ④矩阵含 partial/uncovered 且 handover 零行）任一成立
When verify gate 校验
Then error 阻断，逐条列触发行 + 修复指引（改写 PASS WITH NOTES 并补「## 移交项（结构化）」）

Given 四条件全部不成立
When verify gate 校验
Then PASS 照旧放行（行为零变化）

Given validator 消费 facts（factsExpected=true 而 facts 缺失）
When 校验
Then 全条件按触发处理（双源 fail-closed），报错附「重跑 verify-probes」出路

Given 存量变更未跑管线（factsExpected=false）
When 校验
Then 沿用 checkProbeConsistency 存量兼容口径返回 ok

### FR-02: risk_level 豁免洞分层 + 集成回执口径
覆盖决策：D-002@v1, D-006@v1
Given design frontmatter 显式 risk_level 且降级 unit-sufficient
When 结论=PASS WITH NOTES
Then 维持不要求集成证据（误伤逃生通道保留）

Given 显式声明且仍 integration/deployment-critical，结论=PASS WITH NOTES
When 校验
Then 必须携带结构化 handover 或齐全集成证据，二选一，否则 error

Given 回执条目来源为 compile/lint/纯单测（sourceTag='build'/'unit'）
When 「集成实测已跑」判定
Then 不计入已跑（D-006 判定表：quality-scan 实测记录+跨层回执才算；validator 时点只认已落盘记录）

### FR-03: Runtime Evidence「不涉及」收口
覆盖决策：D-004@v1
Given 判级 integration/deployment-critical，Runtime Evidence 服务端点行=「不涉及」且无对应 handover
When 封顶校验
Then 计入 FR-01 事实面触发

Given 骨架渲染
When 生成 Runtime Evidence 节
Then 注释含降级路径提示（Controller 直调冒烟/基础设施恢复复跑——不要空填不涉及）

### FR-04: probe7 partial/uncovered 联动
覆盖决策：D-003@v1
Given 矩阵存在 partial/uncovered 行且「## 移交项（结构化）」零有效行（任意 severity）
When validateAcceptanceMatrix 校验
Then error（部分实现必须有移交去向）

Given 存在任意级 handover 行
When 校验
Then 该分支放行，封顶与否由 blocking 行决定（FR-01 条件②）

### FR-05: fix.sql 双门
覆盖决策：D-007@v1, D-012@v1
Given design 清单/worktree diff 含 db/*.sql 且 verify-result 无对应「已对目标库执行」声明
When verify 封顶校验（声明面/diff 判定）
Then 事实③触发（FR-01）

Given apply 文件集含 db/*.sql 且无声明
When apply 尾声或 archive --confirm
Then 阻断（兜底门，覆盖 verify 后新增 sql 的时序窗口）

### FR-06: handover severity 分层与防滥用
覆盖决策：D-005@v2
Given handover 行类型 db-script/env-blocked
When severity 判定
Then 默认 blocking；manual-acceptance/other 默认 advisory

Given blocking 行降级为 advisory
When parseHandoverRows 解析
Then 必须含理由文法（降级：<理由>，依据 <file:line 或 D-xxx>），否则按 blocking 处理

Given 存量三列表格行（无 severity 列）
When 解析
Then 零迁移兼容，按类型缺省映射

Given archive Step 3 用户确认
When prompt 组装
Then 注入 facts.handover 清单（severity 标注、blocking 置顶、条目封顶渲染）；db-script 类 handover 与声明门互斥不可同真

### FR-07: skip 跨仓档位
覆盖决策：D-008@v1①
Given 主仓 test_strategy=skip 且某跨仓无自配 commands.test
When verify 测试合并
Then 该跨仓短路通过（消除 npm test fallback 假败）

Given 跨仓自配 commands.test
When 合并
Then 仍执行；跨仓 own local.yaml 可单独 skip

### FR-08: adopt 勾选断链修复
覆盖决策：D-008@v1②
Given 跨仓 task review 经 backfill --adopt 写入（writtenBy=adoptTaskReviewMechanics）且 verdict=pass
When 完成度勾选判定
Then tasks.md 自动勾选生效（白名单 + diffFileSet 含跨仓 diff 源两层修复）

### FR-09: probe7 跨仓内容多根
覆盖决策：D-008@v1③
Given 测试文件位于跨仓仓根
When buildAcceptanceHints 读取
Then 内容可读，命中不再恒空（矩阵不因跨仓恒预填 partial）

### FR-10: design 无段头缺口
覆盖决策：D-008@v1④
Given design 清单无「## <repo> 仓变更」段头且行含跨仓注册路径
When design_file_ref 校验
Then 降 warning 提示补段头，不再按主仓根逼 NEW: 前缀

### FR-11: prompt/清单新增条目
覆盖决策：D-009@v1
Given 变更涉及角色/字典
When 审查清单
Then 含「以生产查询口径可解析到目标结果」条目

Given 变更含新页面/前端路由
When 审查清单
Then 含「用户入口 × 菜单/注册 DML 对账」条目；stages prompt 源与快照测试同步更新

### FR-12: Wave 步骤完成度门
覆盖决策：D-013@v1
Given execute 当前步骤名为「Wave N 执行」，plan.md 含该 Wave 段，且段内任一 task 的 tasks.md checkbox 未勾（经 autoCheckPlanFromReviews 幂等先行后仍未勾）
When 该步骤 --done
Then exit 1 阻断推进，错误列未勾 task 清单 + 两条出路（补实现与 review write / --reopen 退回）

Given 该 Wave 段全部 task checkbox 已勾（含经 review pass 自动勾选）
When --done
Then 放行正常推进

Given plan.md 无该 Wave 段（隐式 Wave/light 计划）或文档读取失败
When --done
Then warn 放行（fail-open，不破坏隐式串行语义）

## 非功能需求
- 兼容性：未触发事实条件零行为变化；存量三列 handover 零迁移；存量无 facts 变更沿用兼容口径；结论枚举/schemaVersion/平台协议不变
- 可回退：validator 纯加法规则，回退=移除注册行；双门各自独立可回退
- 可测试：纯函数 + facts 输入的确定性测试；+60~80 断言覆盖四态/分层/兼容/双源

## 决策覆盖矩阵
| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001@v2 | FR-01 | 封顶条件②改 blocking 级 + facts 锚定输入 |
| D-002@v1 | FR-02 | 豁免洞分层三处改 |
| D-003@v1 | FR-04 | 存在性门槛起步 |
| D-004@v1 | FR-03 | 不涉及收口 + 提示语 |
| D-005@v2 | FR-06 | severity 分层防漏报与防滥用 |
| D-006@v1 | FR-02 | 集成已跑判定表 |
| D-007@v1 | FR-05 | fix.sql 声明门 |
| D-008@v1 | FR-07, FR-08, FR-09, FR-10 | 配套四小修 |
| D-009@v1 | FR-11 | prompt/清单新增 |
| D-010@v1 | FR-01 | 集中式 validator 选型（fail-open 条款被 D-011 收窄） |
| D-011@v1 | FR-01 | facts 锚定纯函数 + 双源 fail-closed |
| D-012@v1 | FR-05 | 事实③ verify 时点源修正 + 双门 |
| D-013@v1 | FR-12 | Wave 步骤完成度门（task-08） |
