---
author: flow-machine-draft
created_at: 2026-10-28T16:03:46.900Z
---
# 任务注册表（Tasks）— 2026-10-29-open-metrics-gate

- [x] task-01: config-schema.js commands 段注册 commands.metrics（string/optional/live，readers 指向 runVerifyMetricsCheck 与 runQuickTestLintGate，desc 含快慢定位、质量维度类别（复杂度上限/重复率/死代码/覆盖率阈值）与命令来源两类形态（生态/构建工具检查任务如 npx·mvn/gradle 目标；仓内自写脚本），语言中立不偏单一生态，机制不绑定工具、example 给可直接跑形态）与 commands.metrics_timeout_sec（number/optional/live，desc 写超时链）——验证：node -e 断言 LOCAL_YAML_SCHEMA 导出含两键 + test/config-schema.test.mjs 扩展注册与 renderExample 带出用例绿
- [x] task-02: verify-postcheck.js 新增 extractMetricsCommand（模块内私有，引号/bare/unavailable 同款容错）与 export runVerifyMetricsCheck（超时链 显式参 > metrics_timeout_sec > env SILLYSPEC_METRICS_TIMEOUT_MS > 缺省 180s；CNF 环境缺件降档复用；无 tally 无 failureFiles；可选 changeFiles 参经 execSync env 注入 SILLYSPEC_CHANGE_FILES）——验证：test/quick-metrics-gate.test.mjs 新文件三态+超时+降档+env 注入用例绿
- [x] task-03: quick-audit.js runQuickTestLintGate 挂载（lint 之后同 gateCwd/gateSpecBase 执行；changeFiles 透传 files 清单注入 SILLYSPEC_CHANGE_FILES；failed 计入 'metrics'；persistLintResult 同款语义落 verify-runs kind:metrics；gate 返回对象/汇总行带 metrics；早退路径 metrics=null）+ verify-quality-scan.js 厚道挂载（noAI 同 lint 步）——验证：quick-metrics-gate 集成用例（纯 doc 跳过/证据落盘）+ verify-quality-scan 既有回归绿
- [x] task-04: flow-review.js renderReviewerTaskbook 检查单增补空实现判据与根因判据条目（检查单编号顺延）；quick-audit.js buildTestSurfaceAdvisory 命中文案附空实现判据句（负例 null 不变）；templates/agents-instruction.md 核心规则 4 lint 语义句后并列 metrics 同款语义句（引导面②）+ skipped reason 引导句（引导面③，落 task-02 的 runVerifyMetricsCheck 文案）——验证：test/flow-review.test.mjs 扩展关键句断言 + advisory 用例 + 引导面三在场断言绿
- [x] task-05: 全相关面回归收束：新用例 + 既有 quick-test-gate / flow-review / config-schema / verify-quality-scan 测试面全绿 + npm run lint 绿 + package.json dependencies 集合与基线一致核对（零依赖）
