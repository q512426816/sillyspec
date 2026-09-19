# 符号影响面报告

> tasks.md 内容指纹（生成时）: 46455aaa9aa2412f——重入本步时若与当前 tasks.md 指纹一致且结论已填全，直接沿用不重做扫描。
> 骨架由 CLI 生成（`sillyspec symbol-impact --change <变更名>`，gate 失败时也会自动落一份）。
> 逐行把 `<!--TODO-->` 替换为真实结论：涉及签名级变更（构造函数参数/接口/DTO/方法签名增删改）
> 写变更类型 + 受影响调用点 + 是否在任务范围内；无签名级变更也要显式写「无签名级变更」。
> **gate 拒绝仍含 <!--TODO--> 的行**——骨架不能直接过门。

- task-01: 无既有签名级变更——src/review-material-pack.js 纯新增导出 assembleStageReviewMaterials({stage,cwd,changeName,specBase})（加法导出，既有导出 buildReviewMaterialPack/extractDesignHotZone/extractSnippets/extractDiffSummary 签名零改动）；新增调用点仅 task-02 的 src/run/prompt.js（在 task-02 allowed_paths 内）。依赖新增 import stage-review-checklist.js（REVIEW_CHECKLISTS）——该文件零 import 纯常量（Grill 已核验无环）。
- task-02: 无签名级变更——src/run/prompt.js outputStep 签名零改动，仅在 tier 注入块内新增动态 import 调用（既有 :1380/:1381 动态 import 先例同款）；src/stages/{brainstorm,plan,execute}.js 仅改 step prompt 模板字符串内容（加 {REVIEW_MATERIALS} 槽＋补位指引），无 step 对象结构/导出面变更；grep 复核三模板无被其他模块按符号消费的导出变动。
- task-03: 无签名级变更——test/review-material-pack.test.mjs 新增组四断言（既有组一二三零触碰）；docs/prompt 镜像为 _extract.mjs 再生产物（数据文件非代码符号）。
