export const definition = {
  name: 'quick',
  title: '快速任务',
  description: '跳过完整流程，直接做',
  auxiliary: true,
  steps: [
    {
      name: '解析参数和上下文',
      prompt: `解析任务参数，加载项目上下文。

### 操作
1. 检查是否携带 \`--change <变更名>\`，确定记录方式
2. 理解任务：模糊则问一个问题确认
3. 加载上下文：\`cat .sillyspec/codebase/{CONVENTIONS,ARCHITECTURE}.md 2>/dev/null\`
4. 加载扫描文档（如存在）：\`cat docs/<project>/scan/{CONVENTIONS,ARCHITECTURE}.md 2>/dev/null\`

### 输出
任务理解 + 上下文摘要`,
      outputHint: '任务理解',
      optional: false
    },
    {
      name: '知识库和文档查询',
      prompt: `查询知识库和外部文档。

### 操作
1. \`cat .sillyspec/knowledge/INDEX.md 2>/dev/null\` — 根据关键词匹配
2. 命中时 \`cat\` 对应知识文件
3. 如果涉及不熟悉的库/框架/API：通过 Context7 查询官方文档
4. 将查询结果纳入后续开发考量

### 输出
相关知识条目和文档查询结果`,
      outputHint: '知识查询结果',
      optional: true
    },
    {
      name: 'TDD 实现',
      prompt: `按 TDD 流程实现任务。

### 操作
1. 先读后写：调用已有方法前 \`cat\` 源文件确认签名，\`grep\` 确认方法存在
2. 🔴 RED → 先写测试，运行确认失败
3. 🟢 GREEN → 写最少代码让测试通过
4. 🔵 REFACTOR → 清理，保持测试通过
5. ✅ STAGE → git add 暂存（测试文件必须包含）

### 纯配置/数据/文档可跳过 TDD，其他一律走 TDD。

### 输出
实现摘要 + 修改文件列表

### 铁律
- ❌ 不写测试（底线是仍然要写测试）
- ❌ 修改无关文件
- ❌ 跳过测试因为"任务太简单"`,
      outputHint: '实现摘要',
      optional: false
    },
    {
      name: '运行测试',
      prompt: `运行测试确认通过。

### 操作
1. 检查 local.yaml 构建命令配置：\`cat .sillyspec/local.yaml 2>/dev/null\`
2. 有则使用 local.yaml 中的命令，否则使用默认命令
3. 默认命令：\`mvn test -pl <模块> -Dtest=<测试类>\` 或 \`./gradlew test --tests <测试类>\` 或 \`pnpm test\` 或 \`npm test\` 或 \`pytest <测试文件>\`

### 输出
测试通过/失败结果`,
      outputHint: '测试结果',
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
