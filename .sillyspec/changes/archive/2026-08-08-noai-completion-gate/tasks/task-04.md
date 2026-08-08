---
id: task-04
title: stage.js noAI 末步分支接入 completeStageGates（S1 核心受害者修复）
title_zh: stage.js noAI 末步接入 completeStageGates
author: qinyi
created_at: 2026-08-08 08:41:43
allowed_paths:
  - src/run/stage.js
---

## 目标
`runStage` 的 noAI 末步 else 分支（`nextIdx===-1`，stage.js:349-355）当前只标 `stageData.status='completed'`(351)+completedAt(352)+`pm._write`(353)+console.log(354) 后直接 `return`(356)，**绕过 `runStageCompletionGates` 与全部阶段完成 handler**（design §5.2.2 S1：plan postcheck independent review / 平台 scanPostcheck manifest 均被吞）。接入 task-01 共享 `completeStageGates`，让以 noAI 步骤收尾的阶段重获 gate + handler + 校验保护。

## allowed_paths
- src/run/stage.js

## 验收标准
- noAI 末步 else 分支：标 stage completed + `pm._write` 落盘 + console.log 之后，插入 `const _r = await completeStageGates({ ... }); if (_r) return _r`（gate 失败已 rollback 时 early-return，不 fall through 到末尾 `return`(356)）。
- **推进分支不受影响**（line 346-348，`nextIdx !== -1`）：非末步 noAI 只标自身 completed + 前进，gate 仍在后续 completeStep 跑（design §5.2.2 触发条件：仅末步有 bug）。
- stage.js 顶部新增 `import { completeStageGates } from './gates.js'`（gates.js 已被 stage.js import，无新循环依赖）。

## 依赖
- **expects_from**: task-01（provides `completeStageGates`，gates.js export）。
- **reads**: `runStage` 入参 pm/progress/stageName/cwd/changeName/platformOpts（stage.js:28）+ 派生 `specBase`(29)/`stageData`/`currentIdx`/`stageData.steps`，均在 noAI 分支作用域内。

## 实现要点
- **仅 else 分支内、`nextIdx===-1` 时**插入；推进分支 (346-348) 一字不动。
- 插入点：line 354（console.log ✅全部完成）之后、else 闭括号(355)前（语义上 = return(356) 前，但放 else 块内更显「只末步跑 gate」）。
- 调用签名（task-01 接口）：`completeStageGates({ stageName, cwd, changeName, platformOpts, specBase, progress, pm, stageData, steps: stageData.steps, currentIdx, outputText: null })`。
- **outputText 传 null**：noAI 分支无 agent 输出（runStage 无 outputText 入参）。`handleScanStageCompleted`→`runScanPostCheck`(complete-handlers.js:821) 收到 outputText=null，平台 quick scan post-check 改靠 scan docs 自证；若 T3 红（manifest/postcheck-result.json/SCAN_COMPLETED 指针未落盘）再议 outputText 来源，不在本 task 预借。
- **steps 传 `stageData.steps`**（pre-reset 原数组）：auxiliary 重置发生在 completeStageGates 内部，调用点数组尚未被重置，合 task-01 §5.4 陷阱约定（守卫用入参 steps，勿在内部重读 stageData.steps）。
- 注：design.md/plan.md 引用行号 352-354/354/357 较现源码 +1（源码实标 stage completed=351-352、落盘=353、return=356），已源码复核，以本文为准。

## TDD
本 task 不直接写测试——受害者复现在 task-05（plan Wave 3）：T1（plan postcheck noAI 末步 independent-tier review verdict=fail 阻断 plan completed + rollback）、T2（validatePlanForExecute 失败阻断）、T3（平台 quick scan step3 noAI scanPostcheck → manifest.json/SCAN_COMPLETED 落盘）。本 task 验收 = `npm test` 全绿 + `npm run lint` 通过 + 现有 stage noAI / scan-postcheck 测试不回归。
