---
author: qinyi
created_at: 2026-08-15 20:05:00
change: 2026-08-15-docs-check-productize
risk_level: low
---

# 验证报告（verify-result.md）— docs-check 产品化

## 结论

PASS

## 任务完成度对账

| Task | 验收标准 | 证据 | 状态 |
|---|---|---|---|
| task-01 校验核心 | 纯函数抽离 + 候选解析同口径 + glob walker | commit 354957e；collectDocRefs/looksLikeCodeSymbol/validateRefLines/extractExpectedTokensFromLine/resolveCandidates/walkGlob/readDocsCheckConfig | ✅ |
| task-02 CLI 注册 | --paths/--json/exit 0-1-2 | commit 2d22e2e + cc39551（审查回炉修 --json 全局变量/--paths 成对解析）；四场景实测 | ✅ |
| task-03 配置段 | schema + renderExample 耦合 | commit 2d22e2e；config-schema.test.mjs 绿 | ✅ |
| task-04 单测 | FR-006 全场景 | 27/27（提取/边界/回退/walker/集成/配置读取） | ✅ |
| task-05 dogfood 迁移 | 两层全开不降级 | 80/80 绿 59 关键词断言，与迁移前输出一致 | ✅ |
| task-06 文档同步 | 三文档一致 | commit 300b957；参数名/缺省值/exit code 逐字核对 | ✅ |

## FR 验收

- FR-001 ✅ `node bin/sillyspec.js docs check` main 实跑 80/80 全绿 exit 0
- FR-002 ✅ 单测三失效场景（文件不存在/行号超界/关键词漂移）→ invalid + exit 1
- FR-003 ✅ `--json` envelope `{ok,total,invalid,warnings,kwChecked}` 实测
- FR-004 ✅ 三级优先 `--paths` > local.yaml（readDocsCheckConfig）> 缺省 `docs/**/*.md`；glob 锚 projectRoot
- FR-005 ✅ dogfood 迁移两层全开（keywordAssert 缺省 true），输出与迁移前一致
- FR-006 ✅ 27 单测覆盖设计列举全部场景（含复杂 glob exit 2、CRLF、多候选宽容）

## Runtime Evidence

- 四场景 CLI 实测：JSON 输出 ok:true / 复杂 glob exit 2 / --paths 缺值 exit 2 / 正常 exit 0
- npm test 全量 0 失败；npm run lint 284 文件通过
- 自举验证：本命令在执行期间三次抓到自身引发的文档行号漂移（CLI 注册 +37 行、回炉修复再增行、cherry-pick 合并），全部由 docs check 自检发现并修正——工具价值的直接实证

## 决策链路

D-001~D-008 全部落地（design.md §6 与实现对账）：

- D-001 独立命令 ✅ / D-002 缺省 docs/**/*.md ✅ / D-003 exit 三档 ✅（exit 2 审查回炉后 CLI 主路径可达）
- D-004 不做语义校验 ✅ / D-005 --strict 已删 ✅ / D-006 全文扫描 ✅ / D-007 两层全保留 ✅ / D-008 glob 零依赖 ✅

## 审查轨迹

- brainstorm Grill：fail（3 blocker）→ 修正 → 复审 pass
- execute 首轮：FAIL（--json 恒 false / --paths 污染 + exit 2 不可达 / local.yaml 无 reader）→ 回炉 commit f0b28f2 → pass（复审独立性受限：API 限额，主 agent 代行实测并如实标注）
- 首次全量扫 docs/ 发现 51 处历史欠账（architecture-4a.md 等）——已登记债单，白名单暂维持 1 份渐进扩

## 风险与遗留

- 历史文档欠账 51 处未修（超本变更范围，债单登记）
- 层2 窗口文案 [start-2, end+5] 与 slice 实现差 1 行（沿用原实现非回归，无害）
