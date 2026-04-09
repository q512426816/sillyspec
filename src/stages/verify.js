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

### 批量模式验证指引
如果 tasks.md 中有批量特征（引擎/模板/配置/批量生成），采用分层验证：
- **L1 自动化（100%）**：运行验证脚本（如有），检查所有实例的文件存在、格式正确、Schema 校验通过
- **L2 AI 抽查（5-10 个）**：选择最复杂的 3 个 + 最简单的 2 个 + 有特殊逻辑的，检查业务逻辑正确性
- **L3 模式性 bug 检测**：L2 发现 bug → 判断是否为系统性问题 → 系统性 bug 则回退修复引擎并重新生成所有实例

### 输出
任务完成度列表 + 完成率

### 注意
- 不修改任何代码，只做检查和报告`,
      outputHint: '任务完成度报告',
      optional: false
    },
    {
      name: '对照设计检查',
      prompt: `对照 design.md 检查实现一致性。**design.md 是唯一 truth source，不符合 design.md 的实现 = Bug。**

### 操作
1. 架构决策是否遵循
2. 文件变更清单是否一致
3. 数据模型是否符合
4. API 设计是否符合
5. **Reverse Sync 检查**：如果发现实现合理但 design.md 未覆盖，先更新 design.md 补充遗漏

### 输出
一致性检查结果`,
      outputHint: '设计一致性报告',
      optional: false
    },
    {
      name: '运行测试和质量扫描',
      prompt: `运行测试和代码质量扫描。

### 操作
1. 读取 \`.sillyspec/local.yaml\` 获取构建和测试命令
2. 如果 local.yaml 有 test 命令，使用它（仅测试变更涉及的模块，非全量）
3. 如果 local.yaml 无 test 命令，根据项目类型选择：
   - Maven：\`mvn test -pl <变更模块> -am\`（仅编译变更模块及其依赖）
   - Gradle：\`./gradlew :<模块>:test\`
   - npm/pnpm：\`pnpm test --filter=<包名>\` 或 \`npm test -- --testPathPattern=<相关文件>\`
   - Python：\`pytest <变更模块路径>/\`
4. 记录通过/失败数量，分析失败原因
5. 搜索技术债务：grep TODO/FIXME/HACK/XXX（仅限变更文件）
6. 如果 local.yaml 有 lint 命令，运行 lint 检查

### 注意
- 不要全量编译/测试整个项目，只测变更涉及的模块
- 如果变更模块不确定，优先使用 local.yaml 中的命令

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
