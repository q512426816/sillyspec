export const definition = {
  name: 'verify',
  title: '验证确认',
  description: '对照规范检查 + 测试套件',
  steps: [
    {
      name: '状态检查',
      prompt: `检查当前状态，确认可以执行 verify。

### 操作
1. 运行 \`sillyspec progress show\`
2. 确认 currentStage 为 "verify"

### 输出
当前状态摘要`,
      outputHint: '状态摘要',
      optional: false
    },
    {
      name: '加载规范并锚定',
      prompt: `加载规范文件并确认。

### 操作
1. 读取 proposal.md、design.md、tasks.md、requirements.md
2. 标注每个文件的存在/不存在状态

### 输出
文件加载确认清单`,
      outputHint: '文件确认清单',
      optional: false
    },
    {
      name: '逐项检查任务',
      prompt: `对照 tasks.md 检查每个任务完成状态。

### 操作
对每个 checkbox：
1. 检查相关文件是否存在
2. 检查代码是否实现了描述的功能
3. 标记：✅ 已完成 / ❌ 未完成 / ⚠️ 部分完成

### 输出
任务完成度列表 + 完成率

### 注意
- 不修改任何代码，只做检查和报告`,
      outputHint: '任务完成度报告',
      optional: false
    },
    {
      name: '对照设计检查',
      prompt: `对照 design.md 检查实现一致性。

### 操作
1. 架构决策是否遵循
2. 文件变更清单是否一致
3. 数据模型是否符合
4. API 设计是否符合

### 输出
一致性检查结果`,
      outputHint: '设计一致性报告',
      optional: false
    },
    {
      name: '运行测试和质量扫描',
      prompt: `运行完整测试套件和代码质量扫描。

### 操作
1. 运行测试：\`pnpm test\` 或 \`npm test\` 或 \`pytest\`
2. 记录通过/失败数量，分析失败原因
3. 搜索技术债务：grep TODO/FIXME/HACK/XXX
4. 运行综合校验（lint、测试等）

### 输出
测试结果 + 技术债务标记`,
      outputHint: '测试结果 + 技术债务',
      optional: false
    },
    {
      name: '输出验证报告',
      prompt: `生成完整验证报告。

### 操作
1. 汇总以上所有检查结果
2. 给出结论：PASS / PASS WITH NOTES / FAIL

### 输出
验证报告 markdown + 下一步命令

### 注意
- PASS → 下一步 archive
- FAIL → 修复后重新 verify`,
      outputHint: '验证报告',
      optional: false
    }
  ]
}
