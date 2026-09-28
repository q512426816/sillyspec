# 符号影响面报告

> tasks.md 内容指纹（生成时）: b7a070d858a1e8b0——重入本步时若与当前 tasks.md 指纹一致且结论已填全，直接沿用不重做扫描。
> 骨架由 CLI 生成（`sillyspec symbol-impact --change <变更名>`，gate 失败时也会自动落一份）。
> 逐行把 `<!--TODO-->` 替换为真实结论：涉及签名级变更（构造函数参数/接口/DTO/方法签名增删改）
> 写变更类型 + 受影响调用点 + 是否在任务范围内；无签名级变更也要显式写「无签名级变更」。
> **gate 拒绝仍含 <!--TODO--> 的行**——骨架不能直接过门。

- task-01: 无签名级变更。全新模块 src/route-hindsight.js，新增导出 computeHindsightMetrics/markHindsight/readHindsightHint（全新符号，无既有调用点）；唯一消费方为 task-03 的 src/flow.js 新增 import（在本变更 allowed_paths 范围内，跨 task 交界已对账）。
- task-02: 无签名级变更。src/stages/brainstorm.js 仅在 Step 4/Step 5 指引静态渲染文本中插入检索动作句，不改任何函数签名/导出面；既有渲染测试 execution-mode-render.test.mjs 属回归面。
- task-03: 无签名级变更。src/flow.js 在新建变更成功输出区追加渲染段＋hindsight 提示注入＋flow done 收口 best-effort 接线，不改 flow.js 既有导出签名；清晰度门 exit 2 判定逻辑逐字不动；消费 task-01 新导出（范围内）。test/flow-clarity-probe.test.mjs 为新增测试文件。
- task-04: 无签名级变更。src/run/complete.js 在 completeStep 内追加 warn 级检索回显（复用既有知识检索匹配器，只读消费不修改 src/knowledge-match.js）；src/config-schema.js 仅在 commands 域新增 knowledge-gate 布尔开关条目（schema 数据面增量，不改既有校验函数签名）。test/design-knowledge-check.test.mjs 为新增测试文件。
- task-05: 无签名级变更。templates/agents-instruction.md 纯文案改写＋package.json version 字段 3.30.0→3.31.0，零代码符号改动；init.js 版本感知逻辑只读该字段（约束「不动 init.js 机制代码」遵守）。
