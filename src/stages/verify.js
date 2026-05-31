export const definition = {
  name: 'verify',
  title: '验证确认',
  description: '对照规范检查 + 测试套件',

  // ⛔ 全局护栏：verify 阶段禁止一切破坏性操作
  // 子代理只能「读」和「写报告」，不能「改代码」或「改 git 状态」。
  _globalGuardrails: `
## ⛔ verify 阶段绝对禁止的操作

以下操作在 verify 阶段**绝对禁止**，无论出于任何原因（包括「恢复文件」「修复问题」「清理目录」）：

### 禁止的 Git 操作
- git checkout（覆盖文件）
- git restore（覆盖文件）
- git reset（回滚提交）
- git revert（撤销提交）
- git clean（删除未跟踪文件）
- git stash drop（删除 stash）
- git branch -D（强制删除分支）

### 禁止的文件操作
- 删除任何源码文件（rm、trash）
- 覆盖任何源码文件（cp 覆盖、echo > 覆盖）
- 修改任何源码文件（除了 .sillyspec/ 下的报告文件）

### 只允许的操作
- git status / git diff / git show / git log / git stash list（只读）
- cat / head / grep / find / wc（只读检查）
- 写入 .sillyspec/changes/ 下的报告文件（verify-result.md）
- 运行测试命令（不修改源码）
- 运行 lint 命令（不自动修复）

如果发现文件缺失或异常，**只报告问题，不尝试修复**。
`,

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
2. 加载项目信息：\`cat .sillyspec/projects/*.yaml 2>/dev/null\`
3. 加载本地配置：\`cat .sillyspec/local.yaml 2>/dev/null\`（构建命令、测试命令、lint 命令等）
4. 加载代码规范：\`cat .sillyspec/docs/<project>/scan/CONVENTIONS.md 2>/dev/null\`
5. 标注每个文件的存在/不存在状态

### 模块文档加载
6. 读取 \`.sillyspec/docs/<project>/modules/_module-map.yaml\`（不存在则跳过以下步骤）
7. 根据 design.md 的文件变更清单匹配 _module-map.yaml 中的模块
8. 读取匹配到的 \`.sillyspec/docs/<project>/modules/<module>.md\`

### 输出
文件加载确认清单（含模块文档）`,
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

### ⛔ 红线提醒
- **绝对禁止** git checkout/restore/reset 或删除/覆盖任何文件
- 发现文件缺失只报告，不尝试恢复
- verify 阶段的唯一职责是「检查 + 报告」，不是「修复」`,
      outputHint: '任务完成度报告',
      optional: false
    },
    {
      name: '对照设计检查',
      prompt: `先运行自动探针，再对照 design.md 检查实现一致性。**design.md 是唯一 truth source，不符合 design.md 的实现 = Bug。**

### 自动探针（必须先执行）
在检查前，依次运行以下三个探针，将结果作为验证输入：

**探针 1：未实现标记扫描**
在项目源码目录中搜索未实现标记：
\`\`\`bash
grep -rn "尚未实现\|TODO\|FIXME\|HACK\|XXX" <源码目录>/ --include="*.java" --include="*.js" --include="*.ts" --include="*.jsx" --include="*.tsx" --include="*.py"
\`\`\`
记录每个匹配的文件、行号和内容。

**探针 2：设计关键词覆盖探针**
1. 读取 design.md，从中提取所有能力关键词（如"登录"、"导出"、"批量"、"删除"、"搜索"等动作词）
2. 对每个关键词，在源码目录中 grep 确认是否有对应的实现代码：
\`\`\`bash
grep -rl "<关键词>" <源码目录>/ --include="*.java" --include="*.js" --include="*.ts" --include="*.jsx" --include="*.tsx" --include="*.py"
\`\`\`
3. 如果某个关键词在源码中完全没有匹配，标记为 ⚠️ 可能未实现

**探针 3：验收标准测试覆盖探针**
1. 读取变更目录下的 tasks.md，提取所有 checkbox 任务
2. 对每个 task，检查对应模块目录下是否存在测试文件（*test*、*spec*、*Test*、*Spec*）
3. 没有测试文件的 task 标记为 ⚠️ 缺少测试

### 探针结果处理
- 将三个探针的结果汇总为「探针报告」
- 如果探针发现问题（未实现标记、关键词缺失、测试缺失），在最终验证报告中明确标注
- 探针发现的问题不等同于验证失败，但必须在报告中列出

### 设计一致性检查
基于探针结果，继续检查：
1. 架构决策是否遵循
2. 文件变更清单是否一致
3. 数据模型是否符合
4. API 设计是否符合
5. **Reverse Sync 检查**：如果发现实现合理但 design.md 未覆盖，先更新 design.md 补充遗漏
6. **模块文档一致性检查**：如果在"加载规范并锚定"步骤中加载了模块文档，检查实现是否符合模块文档描述的当前设计（特别关注接口签名、数据流、依赖关系）。不符合时标记 ⚠️（不阻断，模块文档可能未及时更新）

### 输出
探针报告 + 设计一致性检查结果 + 模块文档一致性检查结果`,
      outputHint: '设计一致性报告',
      optional: false
    },
    {
      name: '任务蓝图验收',
      prompt: `检查每个 task-N.md 的验收标准是否全部满足。

### 操作
1. 检查变更目录下 tasks/ 是否存在
2. 如果存在：
   - 逐个读取 tasks/task-NN.md
   - 检查每个文件的「验收标准」checkbox 是否全部勾选
   - 未勾选的项列为不通过
3. 如果不存在：跳过此步骤

### 输出
验收结果：通过/不通过 + 未通过的项`,
      outputHint: '验收结果',
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
      prompt: `生成完整验证报告，并写入 verify-result.md。

### 操作
1. 汇总以上所有检查结果
2. 生成 verify-result.md 文件，保存到 \`.sillyspec/changes/<change-name>/verify-result.md\`
3. 给出结论：PASS / PASS WITH NOTES / FAIL

### verify-result.md 格式
\`\`\`markdown
# 验证报告

## 结论
PASS / PASS WITH NOTES / FAIL

## 任务完成度
（逐项检查任务的结果）

## 设计一致性
（对照 design.md 的检查结果）

## 探针结果
- 未实现标记扫描：...
- 关键词覆盖：...
- 测试覆盖：...

## 测试结果
（测试套件执行结果）

## 技术债务
（TODO/FIXME/HACK 统计）

## 代码审查
（问题列表 + 总体评价）
\`\`\`

### 输出
verify-result.md 路径 + 验证报告摘要 + 下一步命令

### 注意
- PASS → 运行 \`sillyspec run archive\` 归档
- FAIL → 修复后运行 \`sillyspec run verify\` 重新验证
- verify-result.md 是变更包的正式验收记录，归档后保留`,
      outputHint: '验证报告',
      optional: false
    }
  ]
}
