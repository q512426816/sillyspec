---
author: flow-machine-draft
created_at: 2026-11-04T01:50:26.999Z
---
# 任务注册表（Tasks）— 2026-11-04-model-provider-cascade

- [x] task-01: model-memory.ts 助手（rememberLastModel/getLastModel，key sh:last-model:<providerId>，JSON 容错 SSR 安全）+ 单测——vitest 助手用例绿验证
- [x] task-02: SessionConfigBar 级联重做——供应商点选三模式自动解析模型（记忆→候选第一→空）、模型下拉默认项门控（具体供应商无默认/不指定态维持隐藏）、显式选模型写记忆+provider NULL 成对补暂存 engineDefaultProvider、快照空模型显示回退——vitest 配置条用例绿验证（FR-01/02/04 场景）
- [x] task-03: 发送失败 toast——panel-page 三点位+dialog 两点位 inject 失败 catch 补 notify.error（既有横幅/占位轮回退零变化）——vitest page 用例断言 toast（FR-05）
- [x] task-04: 回归全量——frontend vitest 相关面（config-bar 全文件 + page 相关 + lib 新增）全绿 + tsc 0 错
