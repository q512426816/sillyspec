export const definition = {
  name: 'status',
  title: '状态查看',
  description: '查看项目进度和状态',
  auxiliary: true,
  steps: [
    {
      name: '检查工作区模式',
      prompt: `判断是否为工作区模式。

### 操作
1. \`ls .sillyspec/projects/*.yaml 2>/dev/null | grep -q .\`
2. 是 → 工作区模式，对每个子项目执行状态检查
3. 否 → 单项目模式，继续后续步骤

### 工作区模式输出格式：
\`\`\`
🏢 工作区状态
📦 子项目：
  ✅ frontend  ./frontend
     📋 项目：已初始化
     📂 代码库：已扫描（7 份文档）
     🔄 进行中：1 个变更
  ⚠️ backend   ./backend
     📂 代码库：未扫描
📄 共享规范：2 份
\`\`\`

### 输出
工作区/单项目判断`,
      outputHint: '模式判断',
      optional: false
    },
    {
      name: '项目基础信息',
      prompt: `收集项目基础信息。

### 操作
1. \`cat .sillyspec/PROJECT.md 2>/dev/null || echo "未初始化"\`
2. 获取 project 名
3. \`ls docs/<project>/scan/ 2>/dev/null | head -10\`
4. \`cat .sillyspec/REQUIREMENTS.md 2>/dev/null | head -20\`
5. \`cat .sillyspec/ROADMAP.md 2>/dev/null\`

### 输出
项目基础信息摘要`,
      outputHint: '项目基础信息',
      optional: false
    },
    {
      name: '变更状态',
      prompt: `检查进行中的变更和归档历史。

### 操作
1. \`ls .sillyspec/changes/ 2>/dev/null | grep -v archive\`
2. 对每个进行中的变更：检查 proposal.md ✅/❌、design.md ✅/❌、requirements.md ✅/❌、tasks.md — X/Y 完成
3. \`ls .sillyspec/changes/archive/ 2>/dev/null | wc -l\`
4. \`cat .sillyspec/HANDOFF.json 2>/dev/null\`

### 输出
变更状态列表`,
      outputHint: '变更状态',
      optional: false
    },
    {
      name: '输出状态报告',
      prompt: `生成完整状态报告。

### 输出格式：
\`\`\`
📊 SillySpec 状态

📋 项目：xxx（已初始化 / 未初始化）
📂 代码库：已扫描（7 份文档）/ 未扫描

🔄 进行中：N 个变更
  - [change-1] Phase 3 (Execute) — tasks 5/8

✅ 已归档：N 个变更
📝 设计文档：N 份
📝 实现计划：N 份

💡 下一步：/sillyspec:continue
\`\`\`

### 注意
- 不修改任何文件`,
      outputHint: '状态报告',
      optional: false
    }
  ]
}
