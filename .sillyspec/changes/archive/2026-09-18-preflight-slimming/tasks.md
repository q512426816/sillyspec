---
author: qinyi
created_at: 2026-09-18 20:50:00
generated_by: agent
change: 2026-09-18-preflight-slimming
---

# 任务清单（Tasks）

- [x] task-01: decisions-io 加 hasDecisionId（## D-xxx@vN 标题字面存在性，机械）+ prompt.js 加 renderPreflightFailures（只读快跑/条数帽 5/超时帽 3s/异常返空）与 shouldInjectFullContext（阶段账本分叉）三纯函数面 (depends_on: 无)
- [x] task-02: outputStep 接线——{PREFLIGHT_FAILURES} 占位符渲染（产出型步骤声明驱动：brainstorm 写文档/生成规范、plan 生成计划、execute 任务步）+ 注入分叉（首步全量/后续摘要行+digest+Read 路径+.runtime/prompt-inject-<change>.json 账本幂等） (depends_on: task-01)
- [x] task-03: index.js --wait --inherit-from 参数（校验→同命令盖章轮进 wait_answers；不存在 exit 2；不带参数逐字节兼容） (depends_on: task-01)
- [x] task-04: 引导文案——stages/execute.js 任务步与 templates/prompts/taskcard-rules.md 加「中间验证定向优先」固定行 + stages/brainstorm.js/plan.js 产出步 preflight 声明 + docs/prompt 三件镜像同步 (depends_on: task-02)
- [x] task-05: NEW:test/preflight-slimming.test.mjs——前置清单（帽/超时/异常三态）+账本幂等与摘要形态+inherit-from 双态+引导行在场+单步中位长度统计钩子；全量 npm test+lint 绿 (depends_on: task-01, task-02, task-03, task-04)
