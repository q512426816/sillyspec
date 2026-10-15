---
author: flow-machine-draft
created_at: 2026-10-15T12:34:32.148Z
---
# 决策记录（Decisions）— 2026-10-15-session-forensics

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 答案：- **最大风险：证据包与「真相」之间隔着 transcript 本体**——agent-session-log 只登记路径，真正的模型 I/O 在各 harness 的日志文件里，格式因 harness 而异（claude jsonl/codex rollout/zcode model-io）。CLI 不解析 transcript 内容（解析器是三套格式 × 持续演化的维护泥潭，且 agent-session-log 注释已实证 fail-closed 立场），解读交给任务书里的 agent——这是设计意图不是缺陷，但意味着 diagnose 的价值上限取决于执行任务书的 agent 是否真读文件。缓解：任务书首条纪律即「先读证据包列出的文件本体再下结论」+ path:line 铁律使空谈结论无处遁形（报告评审时一眼可见）。 - **次风险：六维度骨架被当成完备清单**——真因可能不在六个维度里（如需求本身就是错的）。缓解：任务书明示「维度是常见失事面骨架不是封闭清单，证据指向维度外时照报，报告章节允许增设」。 - **第三风险：登记文件的 schema 演化**（agent-session-log.json 由平台协议文档约束，`change_key` 是既有键；若未来登记面废弃该键，过滤面静默变空）。缓解：空清单与「零命中」在输出里显式区分于「源缺失」，doctor/协议演进时会经过登记面自身的测试面；残余风险可接受（取证命令 fail-soft 不阻断任何主流程）。 - **放弃的方案**： - *CLI 解析 transcript 自动出报告*：三 harness 格式 × 演化维护泥潭 + 语义判断错位（见上）；diagnosing-superpowers 本体也是 agent 读 transcript、不是工具解析。 - *进 run 状态机成为 diagnose 阶段*：取证是随时可调用的查询动作不是流程节点，进状态机会引入步骤态/门禁/进度上报面——收益为零成本为正。 - *报告写到 .runtime*：取证报告是要给人读、随变更归档留档的产物——落变更目录（归档时随 change.patch 一起冻结）。
