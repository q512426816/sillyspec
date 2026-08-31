---
author: qinyi
created_at: 2026-08-18T15:00:00+08:00
updated_at: 2026-08-18T16:20:00+08:00
---

# 需求规格（Requirements）

## 角色

| 角色 | 说明 |
|---|---|
| 开发者 | 改源码后需修复文档行号引用的 SillySpec 维护者 |
| CI/CD | pre-push / npm test 中自动跑 doc-ref-check 的校验链路（只读，不使用 --fix） |

## 功能需求

### FR-01: 失效引用自动重锚
覆盖决策：D-002@v2, D-003@v2
Given 文档存在失效 `file:line` 引用，且引用行内有反引号代码符号（token）
When 运行 `sillyspec docs check --fix`
Then 该引用的行号被改写为 token 在候选源文件中的当前所在行，文档其余内容不变

### FR-02: 修复分类输出
覆盖决策：D-002@v2
Given docs check 结果含失效引用
When 展示输出
Then 每条失效引用被分类为 fixable（已修复/将修复）或 needs-manual（多命中/零命中/无 token），并给出原因

### FR-03: 多命中歧义保守处理
覆盖决策：D-006@v1
Given 某 token 在候选源文件中出现多次
When 运行 `--fix`
Then 该引用不被自动修改，输出候选行号列表交人工选择

### FR-04: 无 flag 行为不变
覆盖决策：D-004@v1
Given 不传 `--fix` / `--dry-run`
When 运行 `sillyspec docs check`
Then 行为与现状完全一致（只校验报告，exit code 语义不变）

### FR-05: dry-run 预览
Given 文档存在可修复失效引用
When 运行 `sillyspec docs check --fix --dry-run`
Then 只打印将要修改的内容（文档、行、旧引用 → 新引用），不写任何文件

## 非功能需求

- 兼容性：修复后文档仍是标准 file:line，现有 doc-ref-check / docs-gate / pre-push 零改动即通过；
- 可回退：--fix 只改行号数字不改结构，git diff 可直观 review 后撤销；
- 可测试：applyFixes 为纯函数（传入 fixes 列表），修复分类逻辑基于 runDocsCheck 现有返回结构；
- 跨平台：CRLF/LF 行结束符保持，路径复用现有归一化；
- 零新依赖、零新文件类型、零源码侵入。

## 决策覆盖矩阵

| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001@v1 | 全部 | 只调研不落地（本次产出为设计文档） |
| D-002@v2 | FR-01, FR-02 | 零侵入 --fix 自动重锚 |
| D-003@v2 | FR-01 | 文档保持标准 file:line |
| D-004@v1 | FR-04 | 无 flag 行为与现状一致 |
| D-005@v1 | FR-01 | 零新依赖（token 搜索复用 suggestLines） |
| D-006@v1 | FR-03 | 多命中默认不自动修 |
