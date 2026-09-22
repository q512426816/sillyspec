# 符号影响面报告

> tasks.md 内容指纹（生成时）: 0523445051f3a501——重入本步时若与当前 tasks.md 指纹一致且结论已填全，直接沿用不重做扫描。
> 骨架由 CLI 生成（`sillyspec symbol-impact --change <变更名>`，gate 失败时也会自动落一份）。
> 逐行把 `<!--TODO-->` 替换为真实结论：涉及签名级变更（构造函数参数/接口/DTO/方法签名增删改）
> 写变更类型 + 受影响调用点 + 是否在任务范围内；无签名级变更也要显式写「无签名级变更」。
> **gate 拒绝仍含 <!--TODO--> 的行**——骨架不能直接过门。

- task-01: 新增符号（非改签名）：`export async function readStageBurst(cwd) -> Promise<boolean>`（src/run/shared.js）。纯新增 export，既有符号零变化；消费点 task-02（runStage burst 门）与 task-03（command.js 分发门）在任务范围内后续接线。注意 check-syntax 未引用导出 hard-fail：本 task 同卡建 test/stage-burst.test.mjs 引用之（task 卡已声明）。
- task-02: 无签名级变更。抽取的两个助手（executeNoAiCliAction/finalizeStageAllStepsDone）为 stage.js 模块内部函数（不 export），runStage 对外签名与返回值零变化；outputStep/collectStageWaitHistory 只调用不改。
- task-03: 新增符号（非改签名）：`export async function completeStepBurst(pm, progress, stageName, cwd, outputText, inputText, options)`（src/run/complete.js，与 completeStep 同构签名）。completeStep 本体零 diff（D-003 铁律）；command.js 两处内部分发改调新函数，不改对外 CLI 参数面。
- task-04: 无签名级变更。readFlowConfig(specBase) 签名与返回结构不变，仅 mode 缺省值 'thin'→'legacy'（值语义翻转=D-010 用户裁定，调用点 cmdFlowStart/cmdFlowDone 行为分支按配置走，无需改调用点）。
- task-05: 无签名级变更（纯测试新增，NEW:test/stage-burst.test.mjs）。
