export const definition = {
  name: 'explore',
  title: '自由探索',
  description: '讨论、调研、画图，不写实现代码',
  auxiliary: true,
  steps: [
    {
      name: '自由探索',
      prompt: `围绕用户给出的话题做技术探索，不进入实现。

### 操作
1. 明确探索边界：这次只讨论、调研、画图和识别风险
2. 如果需要代码库上下文，可以读取：
   - \`.sillyspec/projects/*.yaml\`
   - \`.sillyspec/docs/<project>/scan/ARCHITECTURE.md\`
   - \`.sillyspec/docs/<project>/scan/CONVENTIONS.md\`
   - \`.sillyspec/changes/<change-name>/design.md\`
3. 调查兵器按话题选（话题→兵器映射，全只读）：
   - 词面考古（"这段代码在哪/怎么写的"）→ \`rg\` / \`ls\` / \`cat\`
   - 坑史检索（"这话题以前踩过什么坑"）→ \`sillyspec knowledge search --query "<关键词>"\`（四层召回）
   - 关系面（影响面/历史决策/需求谱系）→ \`sillyspec knowledge graph impact <文件|模块|变更名>\` 多跳闭包与防复潮可达的已否决决策、\`neighbors <锚点>\` / \`path <A> <B>\` 推理链、\`summary\` 知识面健康度——比较方案前先看 impact 的 rejected/⚰️死路条目，已否决的路不重新兜售；全部支持 \`--json\`
   - 在途面（出方向建议前）→ \`sillyspec status\` 活跃变更一览——结论别跟在途工作撞车
4. 输出 2-3 个有价值方向、关键风险和下一步建议
5. 如果用户要求保存结论，先明确保存位置，再写入对应文档
6. 讨论 UI/交互方案且用户明确要求原型时，按下方「HTML 原型生成」执行

### HTML 原型生成（仅用户明确要求时）
探索保持只读姿态：不主动写原型文件；UI 讨论成形时可以提议（"要不要出个原型看效果"），用户同意后再生成。探索期原型是**粗选对比件**（求快不求真，手绘单文件含内联 CSS+JS 在探索期合法，浏览器直接打开）：
- 呈现讨论中的布局/组件/交互流程——用户看到的是"这个方案做出来长什么样"，不是示意图；能用项目真实组件库/设计 token 观感的尽量用（先读 scan 文档与现有前端代码），降低与真实效果的偏差
- 保存到 \`{SPEC_ROOT}/explore/prototype-<名称>.html\`（目录不存在则先创建；用户指定了其他位置则从其指定）
- 原型是探索讨论工具、不是交付物，也不是实现代码——不要顺手把原型接进项目源码或构建；话题后续进入 brainstorm 时分两路：已是可复跑真码的原型复制到 \`{SPEC_ROOT}/changes/<变更名>/\`（**保留 \`prototype-<名称>.html\` 命名**——execute 按此命名注入，改名＝不注入）走登记复用；手绘粗选件只是方向输入，brainstorm 定稿须按其「生成要求」升级为真码（同方言/可复跑），不得把手绘件直接当定稿登记

### 输出
探索结论、选项对比、风险清单或 ASCII 图；如生成了原型，附原型文件路径

### 铁律
- 不写实现代码
- 不安装依赖
- 不修改文件，除非用户明确要求保存探索结论或生成原型
- 不强行推进到 brainstorm/plan/execute`,
      outputHint: '探索结论',
      optional: false
    }
  ]
}
