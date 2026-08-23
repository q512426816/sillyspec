---
author: qinyi
created_at: 2026-08-23T21:10:00+08:00
---

# 需求（Requirements）— 2026-08-23-adopt-harness-practices

## 功能需求

### Wave 1 — 决策生命周期（G1/G2）

- **FR-01**：decisions.md 记录契约支持四个可选字段（锚点/模块域/否决理由/复潮条件），由 brainstorm Step6 决策记录模板引导写入；旧格式条目解析不失败（缺锚点的 confirmed 条目提炼为「锚点：未记录」+ advisory）。
- **FR-02**：决策提炼入选规则可测试：type∈{architecture,compatibility,boundary,definition,process} 且 status∈{confirmed,accepted} → implemented；任意 type 的 status=rejected → rejected；type=scope 不入选。
- **FR-03**：archive 阶段在 sync-module-docs 之后新增「decision-distill 决策提炼」步骤：纯函数解析 decisions.md，按模块域（缺失时按 impacts 与 _module-map.yaml paths 前缀兜底，仍未中归 unmapped）写入 knowledge/decisions/<域>.md；同 ID 同版本幂等；@vN+1 整段替换并注 supersedes；rejected 条目缺否决理由/复潮条件 → needsWait 转用户裁决；无 decisions.md/无入选条目零输出跳过。
- **FR-04**：knowledge 库条目格式含 状态/锚点/最近确认（HEAD hash）/理由（implemented）或 否决理由/复潮条件（rejected），供 docs-check 机械解析。
- **FR-05**：knowledge-match 扫描 knowledge/decisions/，matchKnowledge 在既有返回 shape 上新增 decisionHits 字段；INDEX.md 路由行由 decision-distill 幂等维护；brainstorm Step2 经 run/prompt.js 注入 rejected 命中（否决理由+复潮条件）。
- **FR-06**：docs-check 新增决策规则（advisory）：锚点路径存在性校验 + behind 复核（模块源码在「最近确认」后前进超阈值 → doctor 报「决策待复核」，默认阈值 10，decisions.behind_threshold 可调）；豁免走 known_failures 新键 decisions.*。

### Wave 2 — 轻量 postmortem（G3）

- **FR-07**：quicklog 根因块支持嵌套列表行四子字段（- 现象/根因/护栏/证据），顶层四字段边界解析行为不变；旧条目纯文本回退不变。
- **FR-08**：quick.js 修正 :103「避免嵌套全角冒号」警告文案（嵌套 - 字段： 列表行合法）+ step3 模板补可选四子字段提示；prompt 镜像同步 quick.md。
- **FR-09**：证据子字段可引用 agent-session-log 路径（agent-log --json 输出）或 review.json/verify-result.md 路径；verify 检出偏差、doctor 检出错乱时 prompt 追加补写提示（advisory）；护栏结论经现有 knowledge 链路回流 known-issues.md。

### Wave 3 — 证据匹配检查（G4）

- **FR-10**：test_strategy 枚举扩为 ['full','module','skip','evidence-auto']；verify-postcheck extractTestStrategy 接线：skip→真跳过（不回退全量，skip 生效时 verify 输出显式标注留审计痕迹）；evidence-auto→按 module-impact.md 推荐检查组合（缺失/不可解析降级 module 并注记）；full/module 语义不变；未配置缺省=全量不变。
- **FR-11**：evidence-auto 推荐结果经 run/prompt.js verify 分支占位符注入 prompt，用户可否决。
- **FR-12**：verify _globalGuardrails 增「不得重复执行已通过的检查；本地聚焦、全量留给 CI/明确要求」条目；verify prompt 注入检查选择指引（行为→聚焦测试/文档→docs-check/门禁→gate）。

## 验收要求

- 全部新增/修改有回归测试（decisions-lifecycle / quicklog-postmortem-fields / config 与 skip 语义）。
- 兼容：未配置新功能时行为不变（缺省全量、无 decisions.md 零输出、旧 quicklog 条目回退）；归档中途变更继续归档（步骤按名兼容）。
- dogfood：本变更自身归档时走 decision-distill 提炼 D-001~D-008 进活跃库（首个用户）。
