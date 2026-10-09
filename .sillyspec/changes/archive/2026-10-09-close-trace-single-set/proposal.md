---
author: flow-machine-draft
created_at: 2026-10-09T06:51:08.912Z
---
# 提案书（Proposal）— 2026-10-09-close-trace-single-set

## 动机

任务原话转写：收口留痕四件套（change.patch + change-patch.json + scope-audit.json + scope-audit.patch）合并为单套：change.patch + change-patch.json 幸存，原 scope-audit.json 的对账面数据（mode/ok/degradedReason/baseAnchor/totals/rows/excluded/closedBy/repos）作为 scopeAudit 子对象并入 change-patch.json（现有顶级键原位不动，CLI 与平台读方零改动）；scope-audit.json/scope-audit.patch 停写，读侧留旧名兼容链兜存量归档（247 个旧形态归档不动）。平台侧（multi-agent-platform）前端 structured-views 新增 change-patch.json 结构化渲染分支、schema 契约注释更新、契约文档演进注记。

成功标准：
- thin（flow done）与 heavy（execute --done）两条通道收口后落盘恰好 change.patch + change-patch.json 两件，JSON 含完整 scopeAudit 面
- 旧形态归档（四件套/thin 双件/heavy 双件）读链全部不回退：scope-audit 表回放、--file 冻结切片、FR 覆盖、知识图谱交付边、漂移检测照常工作
- 平台 assets 端点与前端文件预览对新形态可读，旧归档不白屏
- 相关测试全绿（close-trace-unified、scope-audit 全家、flow-protocol 等）

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. thin（flow done）与 heavy（execute --done）两条通道收口后落盘恰好 change.patch + change-patch.json 两件，JSON 含完整 scopeAudit 面
2. 旧形态归档（四件套/thin 双件/heavy 双件）读链全部不回退：scope-audit 表回放、--file 冻结切片、FR 覆盖、知识图谱交付边、漂移检测照常工作
3. 平台 assets 端点与前端文件预览对新形态可读，旧归档不白屏
4. 相关测试全绿（close-trace-unified、scope-audit 全家、flow-protocol 等）

## 成功标准（可验证）

1. thin（flow done）与 heavy（execute --done）两条通道收口后落盘恰好 change.patch + change-patch.json 两件，JSON 含完整 scopeAudit 面
2. 旧形态归档（四件套/thin 双件/heavy 双件）读链全部不回退：scope-audit 表回放、--file 冻结切片、FR 覆盖、知识图谱交付边、漂移检测照常工作
3. 平台 assets 端点与前端文件预览对新形态可读，旧归档不白屏
4. 相关测试全绿（close-trace-unified、scope-audit 全家、flow-protocol 等）
