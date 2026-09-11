
## ql-20260911-005-a972 | 2026-09-11 00:50:39 | P2 批：next --apply 代跑 + coverage 存在性事实 + 路线图 P2 逐项裁决
状态：已完成
关联变更：（无）
文件：
- src/index.js（next --apply 分支）
- src/run/verify-quality-scan.js（coverage 三函数+动作接线）
- test/coverage-existence.test.mjs（3 用例）
- docs/sillyspec/noai-ir-roadmap.md（P2 逐项裁决）
- .sillyspec/docs/sillyspec/modules/stages.md（旧步骤引用改写）
需求：P2 批：next --apply 代跑 + coverage 存在性事实 + 路线图 P2 逐项裁决
根因：恢复链 next 只建议让 agent 当转述员；探针 3 只判测试文件存在，coverage 存在性是性价比最高的可机械化增量；P2 各项需逐项裁决落地/已满足/留待
方案：①next --apply：CLI 命令形态建议代跑（spawn 同 bin --dir 透传），非命令形态拒绝②coverage：显式 commands.coverage 配置触发（不解析任意 runner stdout），lcov SF 集×diff 交集，渲染只说「有覆盖记录」不说「已覆盖」（评审一裁决语义边界内建），noAI 质量扫描 lint 后采集并落指纹记录③路线图裁决：doctor 修复子命令与 IR dump artifacts 实证已满足；模块卡注入 brainstorm/plan 无路径源维持关键词；铁律8 需 provenance 设计留待；MCP Phase2-3 留待
结果：新测试 3/3 + 回归 6/6 + lint 0 死码 + docs check 547/547（stages.md 旧步骤引用随 P0-4 改写）

## ql-20260911-006-49b0 | 2026-09-11 07:35:59 | P2-c module-map 字段分离：rebuild --force 改 merge 语义
状态：已完成
关联变更：（无）
文件：
- src/modules.js（merge 语义生成段）
- src/stages/archive.js（三章节契约锚补回）
- test/modules-rebuild-merge.test.mjs（2 用例）
需求：P2-c module-map 字段分离：rebuild --force 改 merge 语义
根因：实例 map 文件头常年挂「勿跑 rebuild --force 会清空手动维护」警告——rebuild 实际清空 tags/main_symbols/depends_on/used_by/status/needs_review（旧版只保三个列表字段），人工标注与重建互斥
方案：merge 语义：existing 全字段优先（人工维护不丢）、卡片补缺（role 仅 existing 缺时取、doc 卡片在场时以卡片为准）、骨架默认垫底；dry-run 预览默认保留（重写仍刷 generated_at/排版）；三章节契约锚补回合并步 prompt
结果：新测试 2/2；module 族回归 18/18（含 plan-module-impact-sections 契约锚）

## ql-20260911-007-2be2 | 2026-09-11 07:41:57 | P2-d schema 普及：sillyspec validate 总命令 + 门禁快照 .sillyspec 盲区修复
状态：已完成
关联变更：（无）
文件：
- src/validate-artifacts.js（六类产物校验聚合）
- src/index.js（validate case）
- src/run/gate-snapshot.js（跳过面收窄（盲区修复））
- test/validate-artifacts.test.mjs,test/quick-gate-snapshot.test.mjs（契约测试）
需求：P2-d schema 普及：sillyspec validate 总命令 + 门禁快照 .sillyspec 盲区修复
根因：verify-facts 是唯一有真 validator 的产物；落地实证顺带抓到 gate-snapshot 一刀切跳过 .sillyspec/ 的盲区——声明过的 module-map 补录进不了快照，lint 恒误报（此前过关靠快照创建偶发失败回退主仓的假阴）
方案：validateChangeArtifacts 聚合既有校验器（facts/task reviews 按 marker 最新 run/stage reviews/module-map schema_version+canonical）+ 轻形状（required-evidence/endpoints），skip=未生成不算失败；CLI validate --change [--json] fail exit 1；gate-snapshot 跳过面收窄到 .runtime/与 quicklog/（local.yaml 仍走 cfg 段），声明的 tracked docs 正常 overlay
结果：新测试 3/3（validate-artifacts）+ 快照契约测试更新 4/4；lint 全绿

## ql-20260911-008-ed08 | 2026-09-11 07:48:58 | P2-d 补丁：快照契约测试夹具 mkdir 修复
状态：已完成
关联变更：（无）
文件：
- test/quick-gate-snapshot.test.mjs（夹具 mkdir 修复）
需求：P2-d 补丁：快照契约测试夹具 mkdir 修复
根因：新契约测试写 tracked doc 夹具时未建父目录 ENOENT
方案：夹具补 mkdirSync 三处；overlay 收窄行为本体已随 ql-20260911-007 落地并由 quick 门禁实证（隔离快照内 lint 通过）
结果：quick-gate-snapshot 4/4

## ql-20260911-009-f4f3 | 2026-09-11 07:52:07 | P2-e 铁律 8 收窄：CLI 骨架 provenance 戳（generated_by）
状态：已完成
关联变更：（无）
文件：
- src/design-facts.js,src/taskcard.js,src/index.js（三类骨架盖戳）
- src/run/prompt.js（铁律 8 收窄）
- test/skeleton-provenance.test.mjs（3 用例）
需求：P2-e 铁律 8 收窄：CLI 骨架 provenance 戳（generated_by）
根因：铁律 8 要求所有文档手填 author/created_at——但标准产物全有 CLI 骨架生成器且已预填元数据，手填要求只对「从零手写的补文档」有意义；缺 provenance 标记则「只认 CLI 戳」无从判定
方案：design-init/taskcard/fourpiece 三类骨架盖 generated_by: sillyspec-<命令> 戳（可审计出品方）；铁律收窄为骨架优先（勿删勿手拼 frontmatter），仅手写补文档才手填元数据；validateMetadata 现行为保持（provenance 戳为未来严格化依据）
结果：新测试 3/3；taskcard 族回归 10/10

## ql-20260911-010-f650 | 2026-09-11 07:56:55 | P2-f task 真源归一：CLI 唯一勾选者（review write 落盘即勾）
状态：已完成
关联变更：（无）
文件：
- src/run/complete.js（autoCheck 导出）
- src/index.js（review write 接线）
- src/stages/execute.js,src/stages/verify.js（prompt 单写者化）
- test/task-truth-unify.test.mjs（2 用例）
需求：P2-f task 真源归一：CLI 唯一勾选者（review write 落盘即勾）
根因：双路勾选（agent 手勾 + 机器勾，文件锁串行化）是漂移面：手勾漏勾/幻觉勾导致勾选≠完成的门禁失败；review.json 已 schema 化+git 证据校验，够格当唯一真源
方案：review write 命令落盘即触发 autoCheckPlanFromReviews 按 verdict 渲染 checkbox（导出复用同一函数，--done 兜底不变）；execute/verify prompt 全面改写为单写者声明（禁止手动勾选）；tasks.md 勾选从真相降为显示态；跨会话依赖 command.js（synthesizeStepOutput，ql-020 未提交批次）追加声明过隔离快照
结果：新测试 2/2；review-write/execute-run 回归通过

## ql-20260911-011-a0f5 | 2026-09-11 08:00:48 | P2-g MCP Phase 2：sillyspec mcp 最小 stdio server（四件只读 tools）
状态：已完成
关联变更：（无）
文件：
- src/mcp-server.js（新模块：MCP server）
- src/index.js（mcp case）
- test/mcp-server.test.mjs（2 用例）
- docs/sillyspec/noai-ir-roadmap.md（P2 终态更新）
需求：P2-g MCP Phase 2：sillyspec mcp 最小 stdio server（四件只读 tools）
根因：agent 靠 shell 调 CLI+解析人类可读文本——flag 幻觉与文本解析漂移是真实痛点（铁律专门有一条「不确定命令停下问用户」）；machine-interface envelope 与 next --json 是现成地基
方案：startMcpServer 行协议循环（initialize 回显/tools 能力、tools/list schema 化、tools/call 子进程 --json 隔离——stdout 纪律天然分离且不 import 重模块、notification 与非 JSON 行健壮忽略）；只读边界（Phase 2 不暴露状态推进）；sillyspec mcp 入口供 hosts 配置
结果：新测试 2/2（内存流协议五面 + CLI e2e）；lint 全绿；docs check 547/547

## ql-20260911-012-df94 | 2026-09-11 08:02:56 | P2 收尾：execute skill 勾选归 CLI 同步
状态：已完成
关联变更：（无）
文件：
- .claude/skills/sillyspec-execute/SKILL.md（勾选归 CLI 同步）
需求：P2 收尾：execute skill 勾选归 CLI 同步
根因：P2-f 改了 execute 阶段七处 prompt 为 CLI 唯一勾选者——skill 的 batch 协议说明还写着 checkbox 勾选归主 agent，行为契约需同步
方案：execute skill batch 说明改为：审查与 review.json 归主 agent，checkbox 勾选归 CLI（review write 落盘即按 verdict 自动勾选，禁止手动勾选）
结果：skill 文案与 stages/execute.js 一致；全量回归 127/127 + lint 全绿 + docs check 547/547
