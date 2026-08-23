---
plan_level: full
author: qinyi
created_at: 2026-08-23T21:30:00+08:00
---

# 实现计划（Plan）— deepseek-harness 实践落地

## Spike 前置验证

不需要。两大技术不确定性（archive 步骤按名兼容 run/command.js:111-131、quicklog 嵌套子字段不破坏顶层标签边界 quicklog.js:486-504）已在 Design Grill 中代码实证成立（C-14/C-15 pass），无剩余 Spike 价值点。

## Wave 1（W1 基础：契约 + 纯函数）
- task-01
- task-02

## Wave 2（W1 接线 + 测试；依赖 Wave 1）
- task-03
- task-04
- task-05
- task-06

## Wave 3（W2 轻量 postmortem；task-09 依赖 Wave 2 的 task-05 doctor 改动）
- task-07
- task-08
- task-09
- task-10

## Wave 4（W3 检查选择 + 收尾；依赖 Wave 3 的 quicklog 嵌套形态与 task-11/12 链）
- task-11
- task-12
- task-13
- task-14
- task-15

## 任务总表
| 编号 | 任务 | Wave | 优先级 | 依赖 | 覆盖 FR/D | 说明 |
|---|---|---|---|---|---|---|
| task-01 | decisions.md 契约扩展（brainstorm Step6 模板四可选字段） | W1 | P0 | — | FR-01, D-007@v1 | 锚点 status=confirmed 必填；模块域取 _module-map ID |
| task-02 | 新增 src/decision-distill.js 纯函数 | W1 | P0 | task-01 | FR-02, FR-03, FR-04, D-007@v1 | 入选规则/幂等/supersedes/needsWait/域三级兜底；**含 knowledge INDEX.md 路由行的幂等写入**（写入责任在此，task-04 只消费） |
| task-03 | archive.js 插入 decision-distill 步骤 + 末步 git add | W2 | P0 | task-02 | FR-03 | conditionalWait 先例；插在 sync-module-docs 后 |
| task-04 | knowledge-match 扩展 + decisionHits + run/prompt 注入 | W2 | P1 | task-02 | FR-05, D-006@v1 | 消费侧：扫描 decisions/ 库（路由行由 task-02 写入）；既有 shape 增字段不重构；复用 {SCAN_STALENESS} 先例；含 brainstorm.js Step2 prompt 的 decisions 库路由说明段 |
| task-05 | docs-debt 导出 computeModuleBehind + docs-check 决策规则 + doctor 检查项 | W2 | P1 | task-02 | FR-06, D-003@v1 | advisory；豁免 known_failures decisions.* 新键 |
| task-06 | test/decisions-lifecycle.test.mjs | W2 | P0 | task-01,02,03,04,05 | FR-01~FR-06 | 含归档中途兼容（已过 sync-module-docs 继续归档）与旧格式容错 |
| task-07 | quicklog.js 根因块嵌套四子字段解析 | W3 | P1 | — | FR-07 | 顶层四字段边界不动；旧条目纯文本回退 |
| task-08 | quick.js :103 警告文案修正 + step3 模板提示 | W3 | P1 | task-07 | FR-08, D-008@v1 | 最小纳入，不改流程结构 |
| task-09 | verify/doctor 触发提示段 + 证据引用指引 + 护栏回流确认 | W3 | P1 | task-05, task-08 | FR-09 | advisory 提示；回流走既有 knowledge 链路 |
| task-10 | test/quicklog-postmortem-fields.test.mjs | W3 | P1 | task-07,08,09 | FR-07~FR-09 | 单行压缩兼容/文案一致性锁定 |
| task-11 | config-schema 枚举扩 + 新键 decisions.behind_threshold + verify-postcheck skip 接线 + evidence-auto | W4 | P0 | — | FR-10, D-005@v2 | skip 真跳过+显式标注；evidence-auto 降级 module；含 config-schema.test.mjs 防漂断言更新与 R-07 的 CHANGELOG/doctor 升级提示 |
| task-12 | run/prompt.js verify 分支 evidence-auto 占位符注入 | W4 | P1 | task-11 | FR-11 | 复用 {WORKTREE_BASELINE_INFO} 先例 prompt.js:649 |
| task-13 | verify.js 检查选择指引 + _globalGuardrails 修订 + skip/evidence-auto 语义回归测试 | W4 | P1 | task-11, task-12 | FR-11, FR-12 | skip 不再回退全量 + evidence-auto 占位符注入与降级路径测试（task-12 产出的消费侧验证） |
| task-14 | docs/prompt 镜像同步（brainstorm/verify/archive/quick 四处 + README.md 占位符表） | W4 | P1 | task-01,03,08,13 | R-06 | _extract.mjs 带新旧字符串 sanity 断言；docs/prompt/README.md 占位符表一并更新 |
| task-15 | dogfood 验证 + 历史决策种子回填 | W4 | P1 | task-03, task-06 | R-02 | 本变更归档走 decision-distill，按入选规则预期落库 5 条（见 AC-6）；回填 3-5 条历史高频决策种子 |

## 关键路径

task-01 → task-02 → task-03 → task-06 → task-15（契约→纯函数→步骤接线→回归→dogfood 归档实证，决定最短交付周期）

## 全局验收标准
1. `npm test` 全绿（现有 220 项基线不回归 + 新增 decisions-lifecycle / quicklog-postmortem-fields / skip 语义回归全过）
2. `npm run lint` 通过
3. `sillyspec docs check` 全绿（四处 prompt 镜像与源同步）
4. （brownfield）未配置新功能时行为不变：无 decisions.md 零输出、旧 quicklog 条目纯文本回退、test_strategy 未配置缺省=全量 full
5. skip 接线语义兑现：配置 skip 后真跳过且 verify 输出显式标注（R-07 审计痕迹）
6. dogfood：本变更自身归档时 decision-distill 按 FR-02 入选规则成功落库——预期 5 条：D-002@v1/D-003@v1/D-005@v2/D-006@v1/D-007@v1（D-001/D-004/D-008 为 type=scope 不入选，D-005@v1 已 superseded 不入选——入选规则的行为本身即验收点）；supersedes 替换行为由 test/decisions-lifecycle.test.mjs 同 ID 双版本用例验证（单次归档机制上不会发生版本前进）

## 覆盖矩阵
| ID | 覆盖任务 | 验收证据 |
|---|---|---|
| D-001@v1（方案C分期混合） | 全部 Wave 结构本身 | AC-1/AC-6（无新顶层命令） |
| D-002@v1（决策库文件型） | task-02, task-05 | AC-6（knowledge/decisions/ 文件产物） |
| D-003@v1（docs-check advisory 起步） | task-05 | AC-4（advisory 不阻断归档） |
| D-004@v1（postmortem 走 quicklog） | task-07, task-08, task-09 | AC-1（四子字段测试） |
| D-005@v2（skip 接线 + evidence-auto） | task-11, task-12, task-13 | AC-4/AC-5 |
| D-006@v1（防复潮注入 Step2） | task-04 | AC-6 + decisions-lifecycle 测试 |
| D-007@v1（契约扩展保纯函数） | task-01, task-02 | AC-6（按入选规则落库 5 条，含 D-007） |
| D-008@v1（quick.js 最小纳入） | task-08 | AC-3（quick.md 镜像同步） |

| FR | 覆盖任务 |
|---|---|
| FR-01 | task-01, task-06 |
| FR-02 | task-02, task-06 |
| FR-03 | task-02, task-03, task-06 |
| FR-04 | task-02, task-06 |
| FR-05 | task-04, task-06 |
| FR-06 | task-05, task-06 |
| FR-07 | task-07, task-10 |
| FR-08 | task-08, task-10 |
| FR-09 | task-09, task-10 |
| FR-10 | task-11, task-13 |
| FR-11 | task-12, task-13 |
| FR-12 | task-13 |
