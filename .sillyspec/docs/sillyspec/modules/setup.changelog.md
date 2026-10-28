---
schema_version: 1
doc_type: module-changelog
module_id: setup
author: qinyi
created_at: 2026-08-24T00:40:00+08:00
updated_at: 2026-08-24T00:40:00+08:00
---

# setup 变更索引（changelog sidecar）

> 模块卡的变更索引历史条目迁出至此（卡正文保持精简，降低子代理读取税）；新条目追加到表尾，勿堆回卡正文。卡内既有「变更索引」表为迁出前历史，保留不动。

| 日期 | 变更名 | 摘要 |
|------|--------|------|
| 2026-08-23 | 2026-08-23-adopt-harness-practices | config-schema（local.yaml 单一数据源）：test_strategy 枚举扩 skip / evidence-auto（D-005@v2——skip=真跳过留审计痕迹、evidence-auto=按 module-impact 影响面推荐组合，full/module 语义不变）；新增 live 键 decisions.behind_threshold（决策 behind 复核阈值，缺省 10，reader=readDecisionRulesConfig/src/docs-check.js）；renderExample 落盘段与示例注释同步扩；config-schema 既有测试适配。 |
| 2026-09-11 | 2026-09-11-cross-change-decision-guard | config-schema 增 semantic_guard 段（enabled：boolean optional live，默认 true，fail-open——缺键/读取异常恒 true 不拦门禁）；readers 登记引 readSemanticGuardEnabled（src/semantic-guard.js）；renderExample yaml 块同步（friction_hint 同款形态，live 键 example 防漂耦合测试覆盖）。 |
- ql-20260911-029-2892 | 紧急包小修：parseMakefileTestCommand 重写为行扫描——行内 prereq 按 make 语义回退 make test、新增 ; 同行配方、排除 test := 变量、配方边界=下一非缩进行（旧正则 \s* 吞换行可取错命令致门禁假通过）
- ql-20260912-004-afa2 | registerRepoInLocalYaml async 化+RMW 持 .local.yaml.lock（并发 register 丢条目收口）
| 2026-09-16 | 2026-09-16-friction5-hardening | config-schema 登记 gate_snapshot 段（FR-04/D-002@v1）：live 键 gate_snapshot.copy（array of string，optional，reader=createGateSnapshot）——门禁隔离快照的生成物/额外路径 copy 面，HEAD 快照缺 gitignored 生成物致 lint/test 环境性假败的声明式补齐通道；renderExample 示例段同步（含 ⚠️ junction 活链接写穿透警告），防漂耦合测试覆盖。未配置/空清单全段空转零行为变化。 |
- ql-20260920-010-7a19 | config-schema test_strategy desc 缺省语义更新（配 modules → 缺省 module，v3.29.3 起；未配 → 全量）；纯 note 无新键
| 2026-10-12 | 2026-10-12-review-probe-injection | dogfood 实证驱动（fire-equipment 会话复盘）：三个生产缺陷（dva 双注册、MyBatis 别名冲 |
| 2026-10-13 | 2026-10-14-prestage-consent-gate | 选道双峰问题：659 个归档变更中「头脑风暴预段+轻量收编」中道仅 3 例（1.4%），其余全轻量或完整五阶段。诊断（本 |
| 2026-10-14 | 2026-10-14-thin-turbo-mode | 轻量变更 |
| 2026-10-14 | 2026-10-14-tdd-scope-guidance | agents-instruction 模板规则 3 加「测试按层适用」尾注（AGENTS.md/CLAUDE.md 仓实例同步）；assets/command-cards/flow.md「直接干活」行加按层限定。 |
| 2026-10-14 | 2026-10-14-release-3-32-9 | 发布 sillyspec@3.32.9：收编上一归档变更留痕的并行会话在途件 templates/agents-inst |
| 2026-10-15 | 2026-10-15-title-label-skip | 标题/摘要提取对段头行免疫：标签行跳过取次行+复合词白名单+模块索引摘要同源+模板首行改概括句+存量… |
| 2026-10-15 | 2026-10-15-vector-switch-discoverability | 效果评估清偿批 B1 收尾缺口（用户问出）：向量开关 knowledge.vector_search… |
| 2026-10-15 | 2026-10-15-vector-capability-autodetect | 用户设计裁决：向量开关放每仓 local.yaml 不是终态——端点部署本身就是开关，客户端应自动探… |
| 2026-10-16 | 2026-10-16-title-range-gate | 变更标题强制 10 到 30 字命名 |
| 2026-10-19 | 2026-10-19-init-drop-gemini-opencode | init 移除 gemini/opencode 工具支持 |
| 2026-10-19 | 2026-10-19-thin-order-canon | 轻量道顺序正典与文案面统一 |
| 2026-10-20 | 2026-10-20-scoped-verify-policy | 用户裁决（工具侧钉口径，不靠 agent 自觉）：每变更收口手跑全量测试是重复保险费（实测 3.5-… |
| 2026-10-21 | 2026-10-21-lint-to-prepush | 收口 lint 移交 pre-push/CI 门 |
| 2026-10-23 | 2026-10-23-config-validate-skill | config validate 与配置引导技能 |
| 2026-10-23 | 2026-10-23-schema-registration-debt | schema 补登三键（平台仓 dogfood 欠账） |
| 2026-10-23 | 2026-10-23-py-runner-flags | py 推断运行器尾随 flag 键 |
| 2026-10-23 | 2026-10-23-runner-flags-generic | runner_flags 通用化与依赖面档位 |
| 2026-10-23 | 2026-10-23-knowledge-scope-discoverability | 知识作用域发现面三处引导 |
| 2026-10-23 | 2026-10-23-push-squash | 推送前按变更压扁本地未推送提交 |
| 2026-10-28 | 2026-10-28-shadow-checkpoint | 任务勾选即影子存档，随时读档回滚 |
| 2026-10-28 | 2026-10-29-open-metrics-gate | 收口开放指标门与假测试评审判据 |
| 2026-10-28 | 2026-10-29-metrics-routes | 指标门路由形态：路径集合多语言路由 |
