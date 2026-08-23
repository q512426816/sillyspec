# 符号影响面报告

> tasks.md 内容指纹（生成时）: 88f1ad7a53b5dde9——重入本步时若与当前 tasks.md 指纹一致且结论已填全，直接沿用不重做扫描。
> 骨架由 CLI 生成（`sillyspec symbol-impact --change <变更名>`，gate 失败时也会自动落一份）。

- task-01: 无签名级变更——brainstorm.js Step6 决策记录模板为 prompt 字符串内容扩展（四可选字段说明），不改任何 JS 函数签名。
- task-02: 新增模块导出 parseDecisions(changeDir) 与 distillIntoKnowledge(changeDir, knowledgeRoot, headHash)——全新符号无既有调用点；消费方 task-03/04/05 在各自任务范围内接线。
- task-03: 无签名级变更——archive.js steps 数组插入一个 step 对象（数据结构追加，非函数签名）；末步 prompt 字符串补 git add 清单。
- task-04: matchKnowledge(indexDir, taskContext) 返回 shape 增量字段 decisionHits（追加键，既有 matched/entries/report/json 键不动）——既有调用方（prompt.js/knowledge.js，Grill C-18 实证只读旧字段）不受影响；parseKnowledgeIndex 扫描范围扩展为行为增强不改签名。
- task-05: docs-debt.js 新导出 computeModuleBehind(moduleId, lastConfirmedCommit)（抽现有 moduleDebt 私有逻辑为公共导出，现有调用行为不变）；docs-check.js/doctor.js 为新增规则与检查项（新代码路径），无既有签名修改。
- task-06: 无签名级变更——纯新增测试文件。
- task-07: quicklog.js 内部解析函数增强（根因块嵌套列表行识别）——对外导出的解析入口签名不变，返回结构不新增键（嵌套行归入根因块正文渲染）。
- task-08: 无签名级变更——quick.js :103 警告文案与 step3 模板字符串修改。
- task-09: 无签名级变更——verify.js/doctor.js prompt 字符串追加提示段。
- task-10: 无签名级变更——纯新增测试文件。
- task-11: config-schema.js test_strategy 枚举数组扩容（数据变更非签名）；verify-postcheck.js extractTestStrategy 行为变更（skip 不再回退 full）但签名不变；新增内部纯函数 resolveTestStrategy 为新符号（task-12/13 消费，在任务范围内）。
- task-12: run/prompt.js 注入分支新增（EVIDENCE_AUTO_RECOMMENDATION 占位符渲染）——renderPrompt 类入口签名不变。
- task-13: verify.js _globalGuardrails 字符串与 step prompt 修改 + 测试扩展——无签名级变更。
- task-14: 无签名级变更——docs/prompt 镜像 markdown/json 同步。
- task-15: 无签名级变更——knowledge/decisions/ 种子文件与 INDEX.md 路由行（数据产物）。
