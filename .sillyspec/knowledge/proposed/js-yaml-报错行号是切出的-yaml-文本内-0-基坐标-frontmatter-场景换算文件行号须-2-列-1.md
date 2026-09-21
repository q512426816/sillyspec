---
proposed_at: 2026-09-21T01:27:29.649Z
category: known-issues
status: pending_review
---

# js-yaml 报错行号是切出的 YAML 文本内 0 基坐标，frontmatter 场景换算文件行号须 +2、列 +1

## 问题
jsYaml.load 抛错返回的 mark.line / mark.column 是「切出的 YAML 文本内」的 0 基坐标，直接当文件行号用会错位（off-by-two）；且 js-yaml 原始 message 里内嵌的坐标（如 (19:35)）同样是 YAML 文本坐标而非文件坐标，两者并存易误导定位。2026-09-20 实证：调查报告给的坏行 19/21/25，实际文件坏行是 20/22/26（差值即 frontmatter 首行 --- 占的 1 行 + 0 基换 1 基）。

## 解法
- 换算公式：error.line = mark.line + yamlStartLine（frontmatter 场景 yamlStartLine 恒为 2：首行 --- ，YAML 自次行起，得文件 1 基行）；error.column = mark.column + 1；mark 缺席时回退 1。
- 用真实坏卡断言 error.line 精确值（20/22/26）与 column 精确值（35/17/78）锁死换算，防止回归。
- 报错文案显式给「文件:行:列」，对冲 js-yaml message 内嵌坐标的误导。

## 证据
- src/taskcard-frontmatter.js（parseTaskFrontmatter 换算实现，jsdoc 写明公式与 0 基语义）
- test/taskcard-frontmatter-hardgate.test.mjs:39（三夹具行:列锁死断言）
- 变更档案 changes/archive/2026-09-20-taskcard-yaml-hardgate/ 的 design.md 风险登记 R-01、decisions.md D-001@v1 故障面、verify-result.md 独立复核节（brainstorm 轮抓 P1 行号 off-by-one 已修）；提交 3f854037

## 适用条件
任何对 Markdown frontmatter 做 jsYaml 解析并需向用户报文件内定位的场景；换新解析器或改 frontmatter 提取偏移时须重验行:列断言。

---
> This is a proposed knowledge entry. Review and merge into manual/ or generated/.