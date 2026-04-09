export const definition = {
  name: 'quick',
  title: '快速任务',
  description: '跳过完整流程，直接做',
  auxiliary: true,
  steps: [
    {
      name: '理解任务',
      prompt: `解析任务参数，加载项目上下文。

### 操作
1. 检查是否携带 \`--change <变更名>\`，确定记录方式
2. 理解任务：模糊则问一个问题确认
3. 加载项目信息：\`cat .sillyspec/projects/*.yaml 2>/dev/null\`（了解项目结构和技术栈）
4. 加载上下文：\`cat .sillyspec/docs/<project>/scan/CONVENTIONS.md 2>/dev/null\`
5. 加载本地配置：\`cat .sillyspec/local.yaml 2>/dev/null\`（构建命令、测试命令、环境变量等）
6. 如有 \`--change\`，加载设计文档：\`cat .sillyspec/changes/<变更名>/design.md 2>/dev/null\`（理解设计意图）
7. 如有需要，查询知识库：\`cat .sillyspec/knowledge/INDEX.md 2>/dev/null\`

### 输出
任务理解 + 上下文摘要`,
      outputHint: '任务理解',
      optional: false
    },
    {
      name: '实现并验证',
      prompt: `实现任务。

### 操作
1. 先读后写：调用已有方法前 \`cat\` 源文件确认签名，\`grep\` 确认方法存在
2. 写代码完成任务
3. 如涉及逻辑变更，建议写单元测试验证（不强制，纯配置/文档/小改动可跳过）
4. **不要编译！** 除非用户明确要求或改动量很大

### 输出
实现摘要 + 修改文件列表

### 铁律
- 不要修改无关文件
- 不要编造不存在的 CLI 子命令
- **Reverse Sync**：如果发现 Bug 是 design.md 遗漏导致的，先修 design.md 再修代码`,
      outputHint: '实现摘要',
      optional: false
    },
    {
      name: '暂存和记录',
      prompt: `Git 暂存并记录任务。

### 操作
1. \`git add -A\` — **不要 commit**，由用户通过统一提交
2. 记录：
   - 有 \`--change\`：在 \`.sillyspec/changes/<变更名>/tasks.md\` 追加 task 并勾选，记录精确到秒的时间戳
   - 无 \`--change\`：记录到 \`.sillyspec/quicklog/QUICKLOG-<git用户名>.md\`（按 git 用户名隔离）
3. QUICKLOG 轮转：超过 500 行则重命名为 \`QUICKLOG-<USER>-YYYY-MM-DD.md\`
4. 如果发现项目特有的坑，追加到 \`.sillyspec/knowledge/uncategorized.md\`
5. 任务比预期复杂 → 建议用完整流程

### 输出
暂存确认 + 记录路径`,
      outputHint: '暂存和记录确认',
      optional: false
    }
  ]
}
