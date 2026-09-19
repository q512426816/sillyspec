# 符号影响面报告

> 骨架代生成后主代理填写（三 task 结论）。

- task-01: 新增导出无既有签名变更——NEW:src/review-material-pack.js 四导出（buildReviewMaterialPack/extractDesignHotZone/extractDiffSummary/extractSnippets）全新模块零调用点破坏；src/run/prompt.js 仅 promptText 替换链追加两处 split/join（{REVIEW_MATERIALS} 缺省空串，正常链+降级分支），既有函数签名零变化。
- task-02: 无签名级变更——四个文件的 prompt 模板字符串与 markdown 文案改写（brainstorm.js 输入材料段/plan.js 审查步派发要点/execute.js 操作段/stage-review.js renderPriorRoundFindingsMd 渲染体）；renderPriorRoundFindingsMd 签名 (collected, cap) 不变、返回结构（markdown 字符串）不变。
- task-03: 无签名级变更——NEW:test/review-material-pack.test.mjs（纯测试）；docs/prompt 镜像再生产物；_module-map.yaml 数据补录。
