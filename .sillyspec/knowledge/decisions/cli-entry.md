# 决策知识 — cli-entry

> decision-distill 从变更 decisions.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为 docs-check 机械解析契约，勿手改。

## D-003@v1 : 方案A 三件套——核验 gate + design-init 骨架 + _facts 注入
状态：implemented
变更：2026-09-07-ir-stage-p3c
锚点：未记录
最近确认：6c3509b
理由：方案A：①validateDecisionModuleRefs（纯函数+brainstorm 末步 gate 接线，D-002 语义）②design-init CLI 命令（design.md 十三章节骨架：决策追踪表从 decisions.md 当前版本 D 条目预填、文件变更清单表骨架；Step 6 prompt 卸责为填骨架、不强制——存量手写路径保留）③brainstorm Step2 注入 docs/<project>/scan/_facts.md（存在时全文注入，红线同 scan：禁止重新 grep 底稿覆盖的机械事实）。拒绝方案B（新 YAML 载体：agent 手写前科、与 decisions.md 双写漂移）。

## D-001@v1 : P3d 缩范围=delta 聚合器 + advisory 联动，端点 before 基线明确不做
状态：implemented
变更：2026-09-07-ir-stage-p3d
锚点：未记录
最近确认：f4db7c9
理由：核心缩为两件：①delta 聚合器——sillyspec delta --change <名> CLI 从前三期已就位的机器产物（P3a reconcile-result.json 的 touched/matched 三类差集、module-map 归属、P3b verify-facts.json 探针摘要、decisions.md 提炼清单）聚合生成 delta.md 落变更目录（archify Delta 的 Before/Delta/After 对应物，md 非 yaml 与全系列一致）；②advisory 联动——delta.md 尾部生成「下次 scan facts 建议刷新模块」段（受影响模块清单）。端点 before/after 基线明确不做（contract-matrix 只有事后快照，before 机制独立立项）；增量 scan 引擎不做（scan facts 全量幂等，增量属 scan 域）；knowledge 自动沉淀已有 decision-distill（不重复）。

## D-002@v1 : 方案A——独立 CLI + archive 步骤自动生成双入口
状态：implemented
变更：2026-09-07-ir-stage-p3d
锚点：未记录
最近确认：f4db7c9
理由：预授权抉择：sillyspec delta --change <名> 独立命令（幂等可复跑）+ archive「确认归档」步自动调用（产物随归档目录保存）。四源聚合：reconcile-result.json（最新 verify-runs 取）+ verify-facts.json + module-map 归属推导 + decisions.md 条目（distill 口径当前版本）。md 输出（Before=变更前模块状态摘要/Delta=文件×模块×差集/After=建议动作）。

## D-001@v1 : 基线=execute 启动时幂等快照（首次落盘不覆盖），增删=归档时 delta 第五源
状态：implemented
变更：2026-09-07-endpoint-baseline
锚点：未记录
最近确认：99d255c
理由：用户指令立项（P3d 多次提示）。采集：sillyspec endpoints baseline --change <名>（幂等——已存在不覆盖，首次跑=变更前状态基线）落 .runtime/endpoint-baselines/<change>.json（endpoints[] method/path/source + baseCommit + generatedAt）；execute Step 3（worktree 确认步）prompt 指引 agent 跑一次（对齐 verify-probes --init 先例）。消费：归档时 archive-delta 增第五源——endpoint-extractor 现算当前端点集 × 基线 → diffEndpointSets 纯函数（added/removed）→ delta.md「端点增删」节（替代 P3d 的「独立立项提示」条件行）。provider 产物 endpoints.json 不动（contract-matrix 零改动）。
