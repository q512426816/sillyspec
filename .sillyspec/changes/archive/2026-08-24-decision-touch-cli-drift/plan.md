---
plan_level: light
author: qinyi
created_at: 2026-08-24T02:40:00+08:00
---

# 轻量计划（Light Plan）— 决策锚点触碰提示 + CLI 版本漂移检测

## 来源

design.md（scale=small，Grill 修订版含 D-003 双渲染点 / D-004 双轨检测）。用户 2026-08-24 批准"按你的计划来搞吧"。

## 范围

- src/docs-debt.js：新增导出 computeDecisionTouches（锚点 :行号/:符号 剥离需导出 docs-check 的 anchorFilePath 或复刻正则）
- src/docs-check.js：导出 anchorFilePath（若选择导出）
- src/run/prompt.js：{DOCS_DEBT} 注入处追加决策触碰事实行（第 4 步渲染点）
- src/stages/execute.js：Wave 步 prompt（buildWavePrompt）追加同一 facts 渲染（主渲染点，D-003）
- src/stages/doctor.js：「CLI 版本漂移检查」并入既有检查段（安装根独立解析 + git/version 双轨，D-004）
- docs/prompt/doctor.md + docs/prompt/_extracted.json：镜像同步
- test/decision-touch.test.mjs（新增）+ doctor 相关既有测试如有断言受影响则同步

## 验收

- AC-1：computeDecisionTouches 回归全绿——触碰（精确/子路径/:行号剥离）、仅 implemented 过滤、锚点未记录跳过、空库 empty、零触碰空数组
- AC-2：Wave 步 prompt 渲染实测——有触碰输出事实行（≤5 条截断+省略）、无触碰零输出；第 4 步渲染点重入场景同源事实
- AC-3：doctor 漂移检测——构造 version 不一致 fixture 触发警告；安装根=当前仓（npm link 自身）不误报；非 sillyspec 仓静默；探测失败降级单行
- AC-4：docs/prompt/_verify.mjs doctor 段 0 miss；npm test 全绿（既有断言无回归）；lint 过
- AC-5：computeDocsDebt 既有行为与调用方不变（只增导出）

## 覆盖矩阵

| ID | 覆盖任务 | 验收证据 |
|---|---|---|
| D-001@v1（方案A复用管道） | 全部 | AC-1~4 |
| D-002@v1（doctor 并入既有段） | task-02 | AC-3（步骤数不变） |
| D-003@v1（Wave 步主渲染点） | task-01 | AC-2 |
| D-004@v1（git+version 双轨） | task-02 | AC-3 |
