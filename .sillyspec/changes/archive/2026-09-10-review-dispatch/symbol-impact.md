# 符号影响面报告

> tasks.md 内容指纹（生成时）: 9c0688d48deece12——重入本步时若与当前 tasks.md 指纹一致且结论已填全，直接沿用不重做扫描。
> 骨架由 CLI 生成（`sillyspec symbol-impact --change <变更名>`，gate 失败时也会自动落一份）。
> 逐行把 `<!--TODO-->` 替换为真实结论：涉及签名级变更（构造函数参数/接口/DTO/方法签名增删改）
> 写变更类型 + 受影响调用点 + 是否在任务范围内；无签名级变更也要显式写「无签名级变更」。
> **gate 拒绝仍含 <!--TODO--> 的行**——骨架不能直接过门。

- task-01: 无签名级变更——stages 三件为 prompt 模板文本改引常量渲染（REVIEW_CHECKLISTS 新增导出，非既有签名变更）；调用点：stages/*.js 模板段自身，均在本 task allowed_paths
- task-02: 新增类方法 SillyHubMcpClient.getWorkerResult（新 API 非既有签名变更）；调用点：无既有调用（消费方 task-03 经参数注入，不静态 import）
- task-03: 全新模块 NEW:src/review-dispatch.js（新导出 runReviewDispatch/buildReviewerTaskBook/readDispatchRecord/writeDispatchRecord/clearDispatchRecord/detectStall/extractReviewFromArtifacts/persistStageReview）；既有签名零变更；调用点：task-04（index/command 薄壳）、task-05（动态 import readDispatchRecord——调用点在 stage-review.js 内，属 task-05 allowed_paths）
- task-04: 无既有签名变更——index.js 新增命令分支 + command.js 新增 flag 解析（增量 case，不动既有函数签名）；消费 runReviewDispatch（task-03 导出）
- task-05: 无签名级变更——stage-review.js 报错文案分支 + CHANNEL_DESC 常量文本；新增动态 import readDispatchRecord（调用点在本文件，allowed_paths 内，fail-open）
- task-06: 新增导出 readReviewDispatchConfig（review-dispatch.js 内，task-03 已建文件的增量导出）；无既有签名变更
- task-07: 无签名级变更——纯测试追加（mock 全链路）
