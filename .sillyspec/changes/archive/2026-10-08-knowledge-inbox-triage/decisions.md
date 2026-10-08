---
author: flow-machine-draft
created_at: 2026-10-08T03:26:18.143Z
---
# 决策记录（Decisions）— 2026-10-08-knowledge-inbox-triage

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险=归类误判（条目常跨类，如 antd v6 三坑兼含组件 API 坑与 vi.mock 测试坑、Alembic 条目兼含目录惯例与事故处置）——对策：按主要可操作价值归类，INDEX 关键词行写入跨类关键词多路命中兜底。已放弃方案：① 把「待确认」条目一律升格已核实——放弃，仅核实本仓可查的 sillyspec 9a63466（跨端 mock 契约修复锚），sillyhub 侧条目（execFile ENOENT / antd v6 等）保留「待确认」原样；② 跨类条目拆分进多个文件——放弃，破坏原文完整性且违背「逐条归类」指令；③ 提交 INDEX.md 全文件——放弃，会夹带他会话指向未跟踪 fr/ 新文件的半份逻辑变更。
