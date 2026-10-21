# 决策知识 — skills-docs

> decision-distill 从变更 decisions.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为 docs-check 机械解析契约，勿手改。

## D-unmapped-204@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-29-flow-skill-heartbeat-doc
原编号：D-001@v1
锚点：未记录
最近确认：94d357e5ab2e7d4816a091db0e580cb0b72e2a0a
理由：最大风险：skill 文案与 CLI 实际输出漂移——以刚实测的 flow start/status 输出为准照抄口径。无弃案（纯文案同步）。

## D-unmapped-206@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-29-flow-skill-d007-doc
原编号：D-001@v1
锚点：未记录
最近确认：34c04d9dd9249f261f837cf8072516cae83b3ba2
理由：风险：与 src 口径再漂移——照抄 flow.js 简报现文案。无弃案。

## D-unmapped-207@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-29-skill-prompt-retire
原编号：D-001@v1
锚点：未记录
最近确认：9a44c32586586969def3262a1e5de06919bb08b5
理由：风险：误删仍有引用的 skill——已 grep 全仓（src/test/templates）零引用核验；resume 的恢复语义由 flow skill+AGENTS.md 承担、查看语义由 state skill 承担（职责无空洞）。弃案：保留 resume 改写为新恢复协议——与 flow skill 职责重叠，删比改省一面。

## D-unmapped-278@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-08-knowledge-inbox-triage
原编号：D-001@v1
锚点：未记录
最近确认：bda98076636049009a2f2e032aade374999ea969
理由：最大风险=归类误判（条目常跨类，如 antd v6 三坑兼含组件 API 坑与 vi.mock 测试坑、Alembic 条目兼含目录惯例与事故处置）——对策：按主要可操作价值归类，INDEX 关键词行写入跨类关键词多路命中兜底。已放弃方案：① 把「待确认」条目一律升格已核实——放弃，仅核实本仓可查的 sillyspec 9a63466（跨端 mock 契约修复锚），sillyhub 侧条目（execFile ENOENT / antd v6 等）保留「待确认」原样；② 跨类条目拆分进多个文件——放弃，破坏原文完整性且违背「逐条归类」指令；③ 提交 INDEX.md 全文件——放弃，会夹带他会话指向未跟踪 fr/ 新文件的半份逻辑变更。

## D-unmapped-288@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-09-zcode-skills-sentinel-shorthand
原编号：D-001@v1
锚点：未记录
最近确认：016968bd0934f80bd16955b92803cdee7fcdda67
理由：最大风险：展开正则过宽把非任务数字串（如版本号 task-013、task-010）误切放大证据面——以尾数前瞻 `(?!\d)` + 组内逐段 `\d{1,2}` 双约束锁边，测试③钉住。试过但放弃：在 flow.js 内联一份连写展开正则（放弃理由——与哨兵判定口径分叉，正是本坑复发的温床；收敛为 sentinel-assertions.js 单一导出、两处共用）。

## D-unmapped-304@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-10-quick-refs-purge
原编号：D-001@v1
锚点：未记录
最近确认：5fb2a6a94a3822711af676ffcfd0fd010ff6464d
理由：最大风险：测试计数漏改（command-cards.test.mjs 中 8/16/7 等硬编码计数分散在 5 处）——对策：逐处核对并在收口实测跑该文件。放弃方案：①连 src 存量收尾机制一并删除（src/stages/quick.js + run/command.js quick 分支 + doctor/quick-sessions 运行时清理）——升级前在途会话将失去 --done/--cancel 收尾通道，且牵动 docs/prompt 镜像再生成，属 CLI 功能级变更，超出「指引面清除」的用户诉求边界；②保留墓碑卡/注记做存量会话指路——用户明确否决（「仅存量收尾注记也不要，直接去掉」）。
