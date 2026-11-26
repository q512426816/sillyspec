# 符号影响面报告（symbol-impact）— 2026-11-26-verify-stage-retire

> execute step「加载上下文」产物；基于 plan.md 十任务与 design 文件清单的签名级变更 × 全仓调用点对账。
> 结论：全部命中调用点均在对应 task 的 allowed_paths 覆盖内（与 plan postcheck 的 69 文件对账互证），无范围外调用点。

## 逐任务结论

- task-01: 签名级变更=`checkTransition`（src/stage-contract.js:2048 export，TRANSITION map 语义改边：execute→archive 合法、verify 边移除）。调用点：src/run/stage.js:28（import，本卡面）、src/run/gates.js 等阶段推进消费（task-04 面清理 verify 分支）。另有五处枚举常量（progress/shared.js:7/14/26/31、complete-handlers.js:317）值域变更，消费方按 MAIN_FLOW_ORDER 推导自动跟随。在范围内。
- task-02: 签名级变更=`executeVerifyQualityScan` 更名 `archiveCloseQualityScan`（src/run/verify-quality-scan.js 更名 NEW:src/run/archive-quality-scan.js）。调用点：src/index.js:1642/:1738（动态 import loadReusableQualityScan/evaluateConclusionDraft）、src/machine-interface.js:361（consultFailedScanReuse）、src/runtime-paths.js:43（前缀注册键）、src/flow.js:1310（运行时文件名）——前三者归 task-08 面、flow.js 归 task-08 面（升厚文案+文件名引用），全部在范围内；新增 noAI 分发 case（run/stage.js）属本卡 allowed_paths。
- task-03: 签名级变更=删除 `reapVerifyServices`（src/run/gates.js:2517 export；调用点 gates.js:1514 自身收尾）、删除 `readVerifyMode`/`shouldSkipVerify`/`renderVerifySkipNotice`（src/verify-mode.js 全部 export；调用点 src/run/stage.js 与 src/run/next.js 本卡面、src/stage-contract.js:10 归 task-05 面）。在范围内。
- task-04: 无签名级变更（gates.js 块内删除，不动 export 面）；verifyStartAt 消费点 progress.js:1129/change-registry.js:90 属本卡 allowed_paths。
- task-05: 签名级变更=删除 `validateVerifyOutputs`/`evaluatePassEligibility`/`checkProbeConsistency`/`resolveFactsExpected`/`isIrStrictVerifyChange`（src/stage-contract.js:662/:673/:1548/:1575 exports）。调用点：src/run/gates.js（task-04 面先删调用）、src/run/complete.js:1824（本卡面）。在范围内。
- task-06: 无签名级变更（命令路由/prompt 组装/移交项块删除，文案级）。
- task-07: 签名级变更=src/verify-postcheck.js 导出面拆分（保留十签名零改动；删除探针族 exports）+整文件删除 src/verify-probes.js/verify-facts-schema.js/probe7-anchor-check.js。保留面调用点：src/machine-interface.js:24/:412/:477、src/archive-delta.js:38、module-impact.js:19、review-material-pack.js:70、scope-audit.js:983、config-schema readers——全部归 task-08 面（消费零改动承诺）；删除面调用点：gates.js/complete.js/prompt.js（task-04/05/06 面先删）。在范围内。
- task-08: 无新签名级变更（消费面核对/文案/分支删除；runtime-paths.js:43 前缀键更名与 mcp-server enum 值域变更的调用点均已在本卡 allowed_paths）。
- task-09: 签名级变更=新增 `legacyCompleteRetiredStage(changeName)`（src/progress/stage-machine.js，绕 VALID_STAGES 一次写两态）。调用点：新增 src/doctor-diagnostics.js 检测维度（本卡面）。在范围内。
- task-10: 无签名级变更（纯文档面；_extract.mjs staticStages 值域变更的消费者是提取脚本自身）。
