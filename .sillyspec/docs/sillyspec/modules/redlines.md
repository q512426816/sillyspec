---
schema_version: 1
doc_type: module-card
module_id: redlines
author: zcode-redline-framework
created_at: 2026-09-20T00:45:00+08:00
updated_at: 2026-09-20T00:45:00+08:00
---

# redlines

## 定位

红线机检评估器（2026-09-20-redline-machine-check）：把语义级设计红线（「已结束会话不得假运行」类）转成机器可查断言——消费者仓 `.sillyspec/redlines.yaml` 条目（forbid/require 正则 × scope glob × severity × origin 文档锚）。机制与内容分离：本模块只供机制，清单消费者仓自持，缺清单零打扰。

## 契约摘要

- `parseRedlines(yamlText)` → `{ entries, warnings }`——七字段解析；无效四判据（缺 id / 缺 scope / forbid 与 require 全空 / 坏正则）跳过 + warnings；severity 缺省 error
- `resolveScopeFiles(scopeGlobs, root)` → 仓根相对 POSIX 路径集——glob：`**` 跨层、`*` 单段（段全等，src-guide 不蹭 src）；排除 node_modules/.git/.sillyspec（清单自身不进 scope 防假阴性）/ .runtime/dist/build/.next/__pycache__
- `evaluateRedlines({ entries, root })` → `{ applicable, entryCount, findings, warnings }`——forbid 命中 `{file, line, snippet}`（逐行、多行模式正则）；require scope 全集无命中=缺失；单文件 2MB 上限跳过+warn；单条求值异常跳过+warn（fail-open）
- 消费点：verify-probes 探针 11（advisory，`runRedlineConsistencyProbe`——缺清单/坏 yaml 不适用，命中渲染 ❌/⚠️ 带 statement+origin，不进 PASS 封顶）

## 关键逻辑

- 红线是模式级断言（人写正则人负责，D-001）——statement/origin 保留散文溯源；advisory 定位是攒误报率数据（D-003 退役判据：数据够后另案升硬门）
- 评估器纯函数：root 注入，不读 env/时钟；零新增外部依赖（js-yaml 已有）
- glob→正则：`**`→`.*`、`*`→`[^/]*`，转义序先藏双星防单星规则吞并

## 注意事项

- v1 明示不支持 `?`/字符类 glob；正则过宽误报靠 advisory 渲染 + statement 溯源供人裁
- 探针 11 是 verify-probes 的一部分（调用区/渲染区接线在那边）；本模块不发 IO 之外的副作用
- 首批种子清单（multi-agent-platform 两条：孤儿 tool_use 禁 running 编码 / 用量归属禁后写覆盖）另案落消费者仓
