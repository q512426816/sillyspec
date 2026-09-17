---
author: qinyi
created_at: 2026-09-17 09:24:00
---
# 模块影响分析（Module Impact）— docs 引用锚方括号路径支持 + 陈旧基线自动重锚

> 文件×模块归属由 CLI 按 _module-map.yaml paths 前缀匹配预填；
> **影响类型**（逻辑变更/数据结构变更/接口变更/调用关系变更/配置变更/新增）与 review 标记是语义判断，
> 逐行把 <!--TODO--> 替换为真实结论——以 git diff 为准（真实 > 声明）。

## 模块影响矩阵

| 模块 | 变更文件 | 影响类型 | 需 review |
|---|---|---|---|
| docs-consistency | src/docs-check.js | 逻辑变更（REF_RE/SYMBOL_REF_RE 迭代体括号段并列——提取面超集，解析/校验/修复链零结构变化） | ✅ |
| docs-consistency | src/docs-gate.js | 逻辑变更+接口变更（陈旧分支自动重锚 + checkOpts 四键守卫 + 返回面增 reanchored: boolean） | ✅ |
| docs-consistency | test/docs-fix-capability.test.mjs | 逻辑变更（FR-1.1c 方括号用例组新增 11 条） | — |
| docs-consistency | test/docs-gate.test.mjs | 逻辑变更（自动重锚用例新增 + 陈旧分支旧文案断言随行改写） | — |
| docs-consistency | docs/sillyspec/interface-contract.md | 文档镜像同步（§1.3b gate 语义补自动重锚） | — |

## 未匹配文件

无——五文件全部命中 _module-map.yaml docs-consistency 模块 paths（CLI 前缀匹配曾未命中属索引粒度问题，已人工归位上表）。

## 影响类型说明

逻辑变更 / 数据结构变更 / 接口变更 / 调用关系变更 / 配置变更 / 新增；不确定的影响标 needs review。

## 更新结果

| 目标 | 操作 | 状态 |
|------|------|------|
| modules/docs-consistency.md | 契约摘要 docs-check/docs-gate 两行补方括号段与自动重锚能力面 + 变更索引追加本变更行 + updated_at 刷新（verify 收尾已同步） | done |
| _module-map.yaml | 无需增改（文件归属未变，非索引过期） | skipped |
