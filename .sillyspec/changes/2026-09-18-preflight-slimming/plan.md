---
author: qinyi
created_at: 2026-09-18 21:10:00
generated_by: agent
change: 2026-09-18-preflight-slimming
plan_level: full
---

# 实现计划（Plan）

> 任务真相源：tasks.md（本文件为 Wave 编排与执行指引；checkbox 状态以 tasks.md 为准）。

## 全局硬约束（跨 task 逐字有效）

1. 防打架三约束（评审红线）：前置清单只注本步相关 validator、条数帽 5、验收盯单步 prompt 中位长度不反弹。
2. fail-open 注入面：前置清单/注入分叉任何异常静默降级（不注/回退全量），绝不阻塞 prompt 渲染与门判定。
3. wait 协议兼容：不带 --inherit-from 逐字节一致；盖章轮走既有 wait_answers 通道（回放链不动）。
4. 守恒红线（D-005）：L1 机械门存在性与拦截逻辑零触碰；verify noAI 亲测照跑。
5. 账本写入 withFileLock（quicklog.js:40 先例）+ prune 登记进 complete-handlers.js:181 枚举。

## Wave 1：纯函数面地基

- task-01

**执行指引**：src/decisions-io.js 加 hasDecisionId(changeDir, id)（## D-xxx@vN 标题字面解析，机械零语义）；src/run/prompt.js 加两个导出——renderPreflightFailures（async，只读快跑步骤相关 validator：条数帽 5/超时帽 3s 每 validator/异常或无失败返空串）与 shouldInjectFullContext（读 .runtime/prompt-inject-<change>.json 账本判 {full, digest, firstStep}）。均零副作用纯读。

## Wave 2：接线两路（并行无共享文件）

- task-02
- task-03

**执行指引**：task-02 outputStep 接线——{PREFLIGHT_FAILURES} 占位符渲染机制（消费 stages 的 preflightValidators 声明，渲染时调 task-01 函数；**清单头固定行「已知失败项（非全部要求），清单外仍需按步骤说明自检」进渲染模板——R-07/FR-01，计划评审 gap②**）+ 注入分叉（shouldInjectFullContext 为假时模块/scan 注入改摘要行：digest 前 8 位+可 Read 路径；账本 withFileLock 幂等写）。task-03 wait 协议——src/run/command.js:339/:378-380 加 --inherit-from 解析；src/run/complete.js wait_answers 落账点（:92/:1577）加盖章轮「由 D-xxx@vN 继承确认（CLI 盖章）」；hasDecisionId 假→exit 2；src/index.js help 行；src/run/complete-handlers.js:181 prune 枚举补 prompt-inject-<change>.json。

## Wave 3：引导与镜像

- task-04

**执行指引**：src/stages/execute.js 任务步 prompt 加「中间验证定向优先：node --test <本任务测试文件>；全量 npm test 留 task 收口与 verify --done」固定行；templates/prompts/taskcard-rules.md verify 段同款；src/stages/brainstorm.js、plan.js、execute.js（任务步动态构建 :292——**计划评审 gap①：三 stages 标注统一归本 task 单点，task-02 只做渲染机制不碰 stages 定义**）产出型步骤加 preflightValidators 声明（映射 design-file-list/四件套规则/postcheck 轻子集/allowed_paths 越界速查）；docs/prompt 三件镜像三步流水线同步（brainstorm.md/plan.md/_extracted.json）。

## Wave 4：测试与全量验收

- task-05

**执行指引**：NEW:test/preflight-slimming.test.mjs——①前置清单三态（有失败条数帽截断/超时返空/异常返空）②账本幂等与摘要形态（首步全量标记/后续摘要行含 digest）③inherit-from 双态（存在盖章轮落 wait_answers/不存在 exit 2）+不带参数兼容 ④引导行在场（execute prompt/taskcard-rules）⑤prompt 中位长度统计钩子（渲染长度记录函数导出，verify 验收用）⑥prune 登记断言（complete-handlers 枚举含 prompt-inject——计划评审 gap③①）⑦幂等金丝雀：同 change+stage+step 双渲染字节一致（对齐 test/knowledge-inject.test.mjs:150 先例——计划评审 gap③②）+清单头行在场断言。全量 npm test+lint 绿。

## 风险与回退

- R-01（打架）：三约束写进 task-02 验收；task-05 ⑤ 提供中位长度数据。
- R-03（摘要丢上下文）：摘要行带 Read 路径；摩擦反升即回退分叉（账本删即回全量）。
- 回退路径：三 Phase 各自独立摘除（占位符不渲染/账本删/参数去）；镜像走 git。
- Wave 拓扑预对齐：01 / 02,03 / 04 / 05（02←01 同文件串行；03←01 hasDecisionId；04←02 声明依赖；05 全依赖）。
