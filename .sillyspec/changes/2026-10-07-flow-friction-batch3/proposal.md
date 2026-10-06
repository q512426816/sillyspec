---
author: flow-machine-draft
created_at: 2026-10-06T16:13:04.411Z
---
# 提案书（Proposal）— 2026-10-07-flow-friction-batch3

## 动机

任务原话转写：厚流程第二批 postmortem（sess_4769fd5d 后半，变更 provider-model-list）暴露的 SillySpec CLI 摩擦，本变更清偿四项 + 记录三项撤销：

1) 门禁口径分裂惊讶：gate execute 默认档不含 Stage Review 检查（该检查在 --full 档），agent 跑 gate 见 ok、--done 却被 Stage Review Gate 拦，再手动 register-stage-review——src/machine-interface.js runGate 的 full-stage-review 探测（getLatestStageReviewRunId，只读 marker 存在性）应降门槛进默认档作 informational 提示（--full 的 error 语义不动）。
2) design 清单门三轮返工：design_file_ref_invalid 报错只说「路径不存在/加 NEW: 前缀」，幻觉路径（缺 backend/ 前缀、近似既有文件）不指路——src/design-facts.js checkAgainstRoot 报错应附「相近既有路径」建议（basename 匹配 did-you-mean，扫根时跳过 node_modules/.git/dist 类重目录）。
3) plan Wave 冲突返工链：同 Wave 共享文件 error（plan-postcheck.js L616）只教「手工拆到不同 Wave」——厚流程实证 agent 手工拆错（非合法 Wave 号→伪并行串行链）多轮，而伪并行报错（L1670）已含 plan-adopt-waves 指引、同 Wave 报错没有——补齐同款指路。
4) module-impact.md pending 死信手动回填：verify 硬拦 pending/待办行，agent 实测写一次性 node 脚本批量回填 skipped——CLI 应提供 sillyspec module-impact --change <名> --fill-skipped [--reason <一句话>]（只填 pending/待办行为 skipped，--reason 追加进操作列——对齐文件内规则「确定不同步的行改 skipped 并在操作列写明原因」；done 行与非更新结果表内容不动）。
5) visual-evidence.md 到 verify 才发现该执行期落盘：ui-visual 探针只在 verify 收口执法——execute 收口 gates（src/run/gates.js module-impact advisory 同款位置）应前置 advisory：UI 触达且证据缺失时 console.warn 指引（不阻断 execute，verify 的 error 档语义不变）。

撤销三项（侦察结论，非本批范围）：a) 「--done --answer 需自动补 wait」——complete.js:354-355 现行已自动补全 waitAnswer（requiresWait 门见 answer 即一步完成）；b) 「--step 意图断言拒」——并发安全设计（防他轮会话旧摘要静默完成未实现步骤），报错已带核对与出路，保留；c) 「评审员两轮报同类问题」——评审循环设计问题，另立专项。

成功标准：
- gate execute/verify 默认档新增 stage-review informational 检查：缺 review.json 时 warning 含 register-stage-review 指引、在场时静默 ok；--full 档 full-stage-review 的 error 语义与 id 均不变（默认档用独立 check id 不碰撞）
- design_file_ref_invalid 报错：根下存在 basename 相同的既有文件时附「相近既有路径：…」（至多 3 条），无相近时不附建议段（不加噪）；NEW: 前缀提示保留
- 同 Wave 共享文件 error 文案含 plan-adopt-waves 一键重排指引；伪并行串行链报错（既有）不回归
- sillyspec module-impact --change <名> --fill-skipped [--reason "..."]：pending/待办行状态改 skipped、--reason 追加进操作列、其余内容逐字不动；无 module-impact.md 或无更新结果表时 exit 2 报错；幂等（重跑零改动）
- execute 收口对 UI 触达且缺 visual-evidence.md 的变更打前置 advisory（warn 级，含落盘路径与 verify 执法提示）；非 UI 变更零输出零行为变化
- 既有 test:core 全绿，npm run lint 通过，新增测试收录 test:core

## 变更范围

按成功标准机械推导，共 6 条验收面：
1. gate execute/verify 默认档新增 stage-review informational 检查：缺 review.json 时 warning 含 register-stage-review 指引、在场时静默 ok；--full 档 full-stage-review 的 error 语义与 id 均不变（默认档用独立 check id 不碰撞）
2. design_file_ref_invalid 报错：根下存在 basename 相同的既有文件时附「相近既有路径：…」（至多 3 条），无相近时不附建议段（不加噪）；NEW: 前缀提示保留
3. 同 Wave 共享文件 error 文案含 plan-adopt-waves 一键重排指引；伪并行串行链报错（既有）不回归
4. sillyspec module-impact --change <名> --fill-skipped [--reason "..."]：pending/待办行状态改 skipped、--reason 追加进操作列、其余内容逐字不动；无 module-impact.md 或无更新结果表时 exit 2 报错；幂等（重跑零改动）
5. execute 收口对 UI 触达且缺 visual-evidence.md 的变更打前置 advisory（warn 级，含落盘路径与 verify 执法提示）；非 UI 变更零输出零行为变化
6. 既有 test:core 全绿，npm run lint 通过，新增测试收录 test:core

## 成功标准（可验证）

1. gate execute/verify 默认档新增 stage-review informational 检查：缺 review.json 时 warning 含 register-stage-review 指引、在场时静默 ok；--full 档 full-stage-review 的 error 语义与 id 均不变（默认档用独立 check id 不碰撞）
2. design_file_ref_invalid 报错：根下存在 basename 相同的既有文件时附「相近既有路径：…」（至多 3 条），无相近时不附建议段（不加噪）；NEW: 前缀提示保留
3. 同 Wave 共享文件 error 文案含 plan-adopt-waves 一键重排指引；伪并行串行链报错（既有）不回归
4. sillyspec module-impact --change <名> --fill-skipped [--reason "..."]：pending/待办行状态改 skipped、--reason 追加进操作列、其余内容逐字不动；无 module-impact.md 或无更新结果表时 exit 2 报错；幂等（重跑零改动）
5. execute 收口对 UI 触达且缺 visual-evidence.md 的变更打前置 advisory（warn 级，含落盘路径与 verify 执法提示）；非 UI 变更零输出零行为变化
6. 既有 test:core 全绿，npm run lint 通过，新增测试收录 test:core
