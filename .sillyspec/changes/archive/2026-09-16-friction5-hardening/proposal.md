---
author: qinyi
created_at: 2026-09-16 03:09:52
generated_by: sillyspec-fourpiece-init
---
# 提案书（Proposal）

## 动机
2026-09-16 用户驾驭小结：SillySpec 四阶段门禁质量高（独立审查真抓问题），但存在 5 处摩擦——均为「门禁口径与 agent 实际产出形态错配」类假阳性/静默失败，每次触发都要人工往返或 advisory 逃生。本变更把 5 处摩擦按用户建议方向逐点收口。

## 关键问题
1. **verify 集成回执解析脆弱**：`RECEIPT_LINE_RE`（verify-facts-schema.js:53）单行四字段严格正则——claim 文本含管道符、字段序调换、多行书写均整行不命中 → 回执槽解析 0 条 → integration-critical 变更误报「无绿回执」。全角 ｜ 已容（坑 receipt-fullwidth-parse），但形态自由度问题未根除。
2. **TaskCard 重复 YAML 键静默吞字段**：骨架自动反填 depends_on（tasks.md 注解 + plan.md Wave 双来源）后，agent 再手填同键 → js-yaml 4 对重复键 throw，jsYaml 消费方（parseTaskContracts / parseFrontmatterScalar / validateTaskCommands）catch 后静默降级（repo=null、契约空、命令不校验）；feasibility 走正则逐字段检测不到重复；parseDependsOn 正则取首个命中——三套消费方口径分裂。
3. **worktree apply Gate1 拦合法文档同步**：allow 面 = design §6 ∪ task allowed_paths，`.sillyspec/docs/` 模块文档（filterDeliverableFiles 注释明示「dogfood 模块规范文档 = 交付物，apply 回主仓」）未在 design §6 声明时被「文件清单校验失败」拦——同一文件两道 gate 口径矛盾（filter 保交付、Gate1 拦交付）。
4. **隔离快照缺生成物 → 环境性假败**：verify 实测门禁在 HEAD 快照跑（gate-snapshot.js），gitignored 生成物（api-types/generated 类）不进 HEAD 也不在会话文件集 → lint/test 在快照内缺文件全红，只能 SNAPSHOT_OFF 回主仓对照，多轮人工排查。
5. **probe7 锚点 advisory 口径窄于硬门**：stage-contract `matrixEvidenceHasAnchor` 认 `.test.` 文件名 / file:line / 反引号三形态，probe7-anchor-check 只认 file:line（`/:\d+\b/`）——案例行号随提交漂移时 agent 用 `.test.` 文件名锚过硬门却仍收 advisory 回补提示。

## 变更范围
- R1 回执双形态解析（verify-facts-schema.js + 骨架/prompt 文案同步）
- R2 TaskCard 顶层重复键检测硬报错（plan-postcheck.js feasibility）
- R3 Gate1 白名单 `.sillyspec/docs/`（worktree-apply.js resolveApplyAllowSet + 落地审计报备）
- R4 快照生成物 copy 面配置（config-schema.js + gate-snapshot.js + local.yaml 说明）
- R5 probe7 锚点口径对齐（probe7-anchor-check.js + gates.js 文案）
- 配套测试 5 组（每 FR 一组直测）+ 模块文档认领

## 不在范围内（显式清单）
- 不做回执槽的 YAML 重渲染迁移（存量单行回执必须原样可解析）
- 不改 detectSymlinkStoreLayout 布局探测与 SNAPSHOT_OFF 逃生语义
- 不改 review 声明相交过滤（D-003 既有决策）语义——docs 白名单只并入 allow 面，不开声明通道
- 不做快照内自动执行 gen 类命令（副作用不可控，已否决——见 decisions D-002）
- 不改 stage-contract 硬门锚点三形态口径（本次只对齐 advisory 侧向其收敛）

## 成功标准（可验证）
- FR-01：多行 YAML 回执（字段任意序）与存量单行回执同槽解析等价；含管道符 claim 文本不再截断误判
- FR-02：depends_on 重复键卡片在 plan --done 被 feasibility error 阻断，报错含键名与两处行号
- FR-03：design §6 未声明 `.sillyspec/docs/x.md` 的变更 apply 不再 BLOCKED，且 warnings 报备落地 docs 文件
- FR-04：local.yaml 声明 gate_snapshot.copy 后快照内该路径可见（junction 或 copy 回退）
- FR-05：covered 行证据为 `.test.` 文件名锚（无行号）不再触发 probe7 advisory
