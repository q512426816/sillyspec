export const definition = {
  name: 'quick',
  title: '快速任务',
  description: '跳过完整流程，直接做',
  auxiliary: true,
  steps: [
    {
      name: '理解任务',
      prompt: `解析任务参数，加载项目上下文。

### 📌 本 quick 会话 sessionId: \`<quick-session-id>\`
- CLI 是短进程，run 与 done 是独立进程，sessionId 靠 \`--change\` 跨进程传递
- **完成每个 step 用**：\`sillyspec run quick --done --change <quick-session-id> --output "..."\`
  - 多会话并发时**必须带 \`--change <quick-session-id>\`**，否则可能命中他者会话的状态
  - 不带 \`--change\` 时 fallback 读 \`current-quick-run-id\`（单会话兼容；多会话不可靠）

### 操作
1. 检查关联变更（\`<linked-changes>\`，逗号分隔的变更名列表；显示「（无）」= 不关联变更），确定记录方式
2. 理解任务：模糊则问一个问题确认
3. 加载项目信息：\`cat {SPEC_ROOT}/projects/*.yaml 2>/dev/null\`（了解项目结构和技术栈）
4. 加载上下文：\`cat {SPEC_ROOT}/docs/<project>/scan/CONVENTIONS.md 2>/dev/null\`
5. 加载本地配置：\`cat {SPEC_ROOT}/local.yaml 2>/dev/null\`（构建命令、测试命令、环境变量等）
6. 若有关联变更，加载每个变更的设计文档：\`cat {SPEC_ROOT}/changes/<c>/design.md 2>/dev/null\`（理解设计意图）
7. 如有需要，查询知识库：\`cat {SPEC_ROOT}/knowledge/INDEX.md 2>/dev/null\`

### 模块文档加载
8. 读取 \`{SPEC_ROOT}/docs/<project>/modules/_module-map.yaml\`（不存在则跳过以下步骤）
9. 根据任务描述初步判断可能涉及的模块
10. 读取匹配到的 \`{SPEC_ROOT}/docs/<project>/modules/<module>.md\`

### QUICKLOG 记录（CLI 已接管，无需你手动创建）
本 quick 会话的 ql-ID 由 CLI 在启动时分配，已注入为 \`<quicklog-id>\`。CLI 同时已自动：
- 在 \`{SPEC_ROOT}/quicklog/QUICKLOG-<git-user>.md\` 写入「进行中」条目（含关联变更与预估文件）
- 对每个关联变更 \`<c>\`：在 \`{SPEC_ROOT}/changes/<c>/tasks.md\` 追加未勾选 task \`- [ ] <quicklog-id> <任务描述>\`

**你不要创建或修改任何 QUICKLOG / tasks.md 记录**——完成本任务时 CLI 会自动将条目翻为「已完成」并勾选 task（含轮转）。\`<quicklog-id>\` 可用于 design.md / plan.md / archive / 模块变更索引引用。

### 输出
任务理解 + 上下文摘要`,
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

### 📌 收尾确认 — sessionId: \`<quick-session-id>\`
- 本步骤是最后一步，完成后 quick 会话即结束
- **完成本 step 用**：\`sillyspec run quick --done --change <quick-session-id> --output "<结构见下，结果摘要写这里>"\`
  - 多会话并发**必须带 \`--change <quick-session-id>\`**，不带会 fallback 读 \`current-quick-run-id\` 可能命中他者会话

### ⚠️ 结果摘要模板（必填，CLI 会校验结构）
\`--output\` 是 QUICKLOG「结果：」归档的唯一来源，**必须按此结构给全四项**（逐项一句话，不可用「见前述」替代）：

\`\`\`
需求：用户/任务要什么
根因：为什么这样改（若纯新增/配置/样式无根因，写「无，纯新增/纯样式」）
方案：怎么改的
结果：验证情况（测试数 / lint / typecheck / 部署状态）
\`\`\`

缺任一项，\`--done\` 会被拒并提示缺失字段，补全后重跑即可（不丢进度）。

### 操作
1. 查看 \`git status --porcelain\`，确认只包含本次 quick 相关文件
2. 使用 \`git add -- <file...>\` 暂存本次 quick 实际修改的文件（不要 commit，由用户通过统一提交工具处理）
   - 禁止使用 \`git add -A\`
   - 不要暂存 quick 开始前就已存在的无关改动
3. QUICKLOG / tasks.md 记录由 CLI 在本 step 完成时自动收尾（翻「已完成」+ 勾选 task + 轮转），你无需手动更新
4. 如果发现项目特有的坑，追加到 \`{SPEC_ROOT}/knowledge/uncategorized.md\`
5. 任务比预期复杂 → 建议用完整流程

### 模块文档同步
6. 读取 \`{SPEC_ROOT}/docs/<project>/modules/_module-map.yaml\`（不存在则跳过以下步骤）
7. 对比本次修改的文件（\`git diff --name-only HEAD\`）与模块映射
8. 如果命中模块 → 直接同步模块文档：
   - 读取对应的 \`{SPEC_ROOT}/docs/<project>/modules/<module>.md\`（如不存在则新建）
   - 根据本次改动内容更新模块文档（正文描述当前状态，底部变更索引追加本步骤预注入的 ql-ID）
   - 变更索引格式：\`- <quicklog-id> | <一句话描述>\`
   - 写入模块文档
   - 使用 \`git add -- <module-doc>\` 暂存更新的模块文件
9. 未命中任何模块 → 跳过，不做额外操作

### 输出
暂存确认 + 记录路径 + 模块文档同步结果（如有）`,
      outputHint: '暂存和记录确认',
      optional: false
    }
  ]
}
