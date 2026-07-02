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
1. 检查关联变更（\`<linked-changes>\`，逗号分隔的变更名列表；显示「（无）」= 不关联变更），确定记录方式
2. 理解任务：模糊则问一个问题确认
3. 加载项目信息：\`cat .sillyspec/projects/*.yaml 2>/dev/null\`（了解项目结构和技术栈）
4. 加载上下文：\`cat .sillyspec/docs/<project>/scan/CONVENTIONS.md 2>/dev/null\`
5. 加载本地配置：\`cat .sillyspec/local.yaml 2>/dev/null\`（构建命令、测试命令、环境变量等）
6. 若有关联变更，加载每个变更的设计文档：\`cat .sillyspec/changes/<c>/design.md 2>/dev/null\`（理解设计意图）
7. 如有需要，查询知识库：\`cat .sillyspec/knowledge/INDEX.md 2>/dev/null\`

### 模块文档加载
8. 读取 \`.sillyspec/docs/<project>/modules/_module-map.yaml\`（不存在则跳过以下步骤）
9. 根据任务描述初步判断可能涉及的模块
10. 读取匹配到的 \`.sillyspec/docs/<project>/modules/<module>.md\`

### 创建任务记录（⛔ 此步骤不能跳过，没有 quicklog 记录 = 未完成）
理解完任务后，**必须**立即创建记录文件，再输出任何其他内容：

**A. 始终创建 QUICKLOG（无论是否关联变更）**
1. 使用预注入的 git 用户名：\`<git-user>\`
2. 创建/追加 \`.sillyspec/quicklog/QUICKLOG-\`<git-user>\`.md\`，写入：
   \`\`\`
   ## ql-<YYYYMMDD>-<NNN>-<XXXX> | <now-datetime> | <一句话任务描述>
   状态：进行中
   关联变更：<linked-changes>
   文件：<预估要改的文件>
   \`\`\`
   - ID 格式：\`ql-YYYYMMDD-NNN-XXXX\`
   - \`XXXX\` 是 4 位随机十六进制字符（如 a3f2、b7c1、00ef），**不是描述词缩写**
   - 追加前扫描文件中已有的 \`ql-<当天日期>-\` 前缀的最大序号，+1 作为新序号
   - 每天从 001 开始，跨日重新计数
   - 此 ID 可被 design.md / plan.md / archive / module 变更索引引用

**B. 若关联变更（\`<linked-changes>\` 不为「（无）」）**
3. 解析 \`<linked-changes>\`（逗号分隔的变更名列表，可能有多个 = 一次 quick 同时归属多个变更）
4. 对**每个**变更 \`<c>\`：在 \`.sillyspec/changes/<c>/tasks.md\` 追加一条未勾选 task：
   \`- [ ] <ql-ID> <一句话任务描述>\`（复用步骤 A 生成的同一个 ql-ID）
   - 若 \`changes/<c>/\` 目录或 tasks.md 不存在，先 \`mkdir -p .sillyspec/changes/<c>\` 再创建 tasks.md
   - 同一个 ql-ID 出现在 QUICKLOG 和所有关联变更的 tasks.md 中，便于交叉引用
   - \`<linked-changes>\` 为「（无）」时跳过本步，仅保留 QUICKLOG

这样 Gate 检测到 \`.sillyspec/\` 下有变更，就不会拦截后续的代码修改。

### 输出
quicklog 已创建（必须放在输出的第一行确认）+ 任务理解 + 上下文摘要

⚠️ **先创建 quicklog，再输出任务理解。** 如果 quicklog 未创建，CLI post-check 会报 warning。`,
      outputHint: '任务理解',
      optional: false
    },
    {
      name: '实现并验证',
      prompt: `直接在主工作区实现任务。

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
      name: '暂存和更新记录',
      prompt: `Git 暂存并更新任务记录。

### 操作
1. 查看 \`git status --porcelain\`，确认只包含本次 quick 相关文件
2. 使用 \`git add -- <file...>\` 暂存本次 quick 实际修改的文件（不要 commit，由用户通过统一提交工具处理）
   - 禁止使用 \`git add -A\`
   - 不要暂存 quick 开始前就已存在的无关改动
3. 更新 Step 1 创建的记录：
   - QUICKLOG：找到对应 ql-ID 的条目，将「状态：进行中」改为「状态：已完成」，补充实际改动文件和结果摘要（**始终做**，无论是否关联变更）
   - 关联变更：对 Step 1 在每个 \`changes/<c>/tasks.md\` 写入的 ql-ID task，将其 checkbox 由 \`- [ ]\` 勾选为 \`- [x]\`；若 Step 1 未写入（用户事后才决定关联），则按 Step 1 的格式补写并直接勾选
4. QUICKLOG 轮转：超过 500 行则重命名为 \`QUICKLOG-<USER>-YYYY-MM-DD.md\`（日期取最后一条记录的日期）。新文件从空开始，ql-ID 需扫描同目录所有 QUICKLOG 文件中当天最大序号 +1
5. 如果发现项目特有的坑，追加到 \`.sillyspec/knowledge/uncategorized.md\`
6. 任务比预期复杂 → 建议用完整流程

### 模块文档同步
7. 读取 \`.sillyspec/docs/<project>/modules/_module-map.yaml\`（不存在则跳过以下步骤）
8. 对比本次修改的文件（\`git diff --name-only HEAD\`）与模块映射
9. 如果命中模块 → 直接同步模块文档：
   - 读取对应的 \`.sillyspec/docs/<project>/modules/<module>.md\`（如不存在则新建）
   - 根据本次改动内容更新模块文档（正文描述当前状态，底部变更索引追加本次 ql-ID）
   - 变更索引格式：\`- ql-YYYYMMDD-NNN-XXXX | <一句话描述>\`
   - 写入模块文档
   - 使用 \`git add -- <module-doc>\` 暂存更新的模块文件
10. 未命中任何模块 → 跳过，不做额外操作

### 输出
暂存确认 + 记录路径 + 模块文档同步结果（如有）`,
      outputHint: '暂存和记录确认',
      optional: false
    }
  ]
}
