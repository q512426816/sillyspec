---
proposed_at: 2026-09-21T01:27:49.256Z
category: conventions
status: pending_review
---

# task 卡 frontmatter 的提取+解析只允许走 src/taskcard-frontmatter.js 单一源，禁止另起口径

## 问题（约定背景）
plan 侧曾用宽收正则判 frontmatter 字段在场、verify 侧用 jsYaml 严格解析——同一文件两处判读不一致（plan 说 OK、verify 说没有），口径分裂导致防御承诺失实。

## 约定内容
- 凡需读取 task 卡 frontmatter（提取 YAML 文本或解析成对象）的代码，一律 import src/taskcard-frontmatter.js 的 splitFrontmatter / parseTaskFrontmatter，不得自写正则或另行 jsYaml.load。
- 接口契约：splitFrontmatter(content) → {has, yamlText, yamlStartLine}（界定正则 ^---\r?\n([\s\S]*?)\r?\n--- ，CRLF 容错，yamlStartLine 恒 2）；parseTaskFrontmatter(content) → {ok, hasFrontmatter, fm, error:{message,line,column}|null} 三态（无 frontmatter / 非法 YAML / 合法）。
- 防环约束：该共享模块除 js-yaml 外零仓内依赖——因 plan-postcheck 与 worktree-apply 存在既有依赖边，共享逻辑放新独立模块两侧 import，不可挂靠任一侧。跨模块共享的小工具遵循此「独立零依赖模块」模式。
- 模块归属：已补录 _module-map.yaml 的 stages.paths（lint 门模块归属盲区会拦未登记的 src 新文件）。

## 证据
- src/taskcard-frontmatter.js（实现）；src/stages/plan-postcheck.js、src/verify-probes.js（双侧消费归一）
- 变更档案 changes/archive/2026-09-20-taskcard-yaml-hardgate/ 的 design.md 总体方案 Wave 1、decisions.md D-001@v1；提交 3f854037
- 模块文档 modules/stages.md（契约摘要 frontmatter YAML 硬校验段）

## 适用条件
sillyspec 仓内所有新增的 frontmatter 消费代码（plan 门禁、verify 探针、execute 卡片读取等）；新增跨模块共享解析工具时照搬零依赖防环判据。

---
> This is a proposed knowledge entry. Review and merge into manual/ or generated/.