## 执行流程

1. 解析 tasks.md，按 Wave 分组
2. 同一 Wave 内的任务**并行启动**子代理，不同 Wave **串行等待**
3. 每个 Wave 完成后，根据用户选择的确认频率决定是否暂停
4. 子代理返回结果后，主代理勾选 tasks.md、更新 STATE.md

## 子代理 Prompt 模板

主代理 dispatch 子代理前，必须准备以下 prompt（所有内容**内联**，不让子代理自己读文件）。prompt 格式见 `04b-prompt-template.md`。

需要注入的变量：
- `{任务描述}` — tasks.md 中当前 task 的完整内容（包括步骤字段）
- `{CONVENTIONS.md 全文}` — 来自 `.sillyspec/docs/<project>/scan/CONVENTIONS.md`
- `{编码规范约束}` — 02-scan-conventions 步骤生成的规范摘要
- `{测试模式参考}` — 仅 E2E/测试任务注入，02-scan-conventions 步骤生成
- `{ARCHITECTURE.md 全文}` — 来自 `.sillyspec/docs/<project>/scan/ARCHITECTURE.md`
- `{构建命令}` — `.sillyspec/local.yaml` 中的 build 命令
- `{工作目录}` — 子项目目录路径
- `{相关知识}` — knowledge/ 中匹配到的内容，未命中则删除此段
- `{文档查询指引}` — MCP 检测结果动态注入
- `{本地 Skills}` — 匹配到的 SKILL.md 全文，无匹配则省略
