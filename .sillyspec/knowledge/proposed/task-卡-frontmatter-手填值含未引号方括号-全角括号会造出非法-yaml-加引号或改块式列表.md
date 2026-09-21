---
proposed_at: 2026-09-21T01:28:12.710Z
category: known-issues
status: pending_review
---

# task 卡 frontmatter 手填值含未引号方括号/全角括号会造出非法 YAML——加引号或改块式列表

## 问题
task 卡的 provides / expects_from 等字段由 agent 手填（taskcard 生成器默认不生成这些字段，生成器序列化无此问题），手写 flow 序列值里出现未加引号的方括号、全角括号、花括号时即非法 YAML。实证坏例（multi-agent-platform 仓三张卡，jsYaml 抛 missed comma between flow collection entries）：
rpc_scope_audit_v2_fields: [rows[].cross_repo, repos[]（key/anchor{...}）]
——方括号里的 rows[]. 与全角（）直接进 flow 序列。中文语境下全角括号尤其易踩：视觉不显眼但 YAML 语法非法。

## 解法（作者侧规范）
- 值含方括号 [ ]、全角括号（）、花括号 { } 等特殊字符时：给整个标量加引号，或改用块式列表（每项一行 - 前缀），不要写内联 flow 序列。
- （工具侧兜底已就位）plan 门 feasibility 步骤 0b 对 frontmatter 非法 YAML 硬拦，报错带 文件:行:列 + js-yaml message + 本修复指引，坏卡过不了 plan gate。

## 证据
- test/fixtures/taskcard-bad-yaml/task-01.md:20 / task-02.md:22 / task-03.md:26（三张真实坏卡整卡拷贝夹具，坏行定位）
- src/taskcard.js:57（生成器不生成手填字段的注释）；src/stages/plan-postcheck.js:1303-1316（0b 报错文案含修复指引）
- 变更档案 changes/archive/2026-09-20-taskcard-yaml-hardgate/ 的 design.md 背景节

## 适用条件
agent 手写 task 卡 frontmatter（provides/expects_from 及其他含特殊字符的标量）时；存量手写坏卡在硬门禁上线后会于下次 plan gate 暴露，属预期 fail-closed 行为——先修卡再过门。

---
> This is a proposed knowledge entry. Review and merge into manual/ or generated/.