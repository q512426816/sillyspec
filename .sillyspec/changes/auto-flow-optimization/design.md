# auto-flow-optimization — 整体设计

author: qinyi
created_at: 2026-06-26 12:00

## 1. 背景与问题

### 现状
SillySpec v3.20 的核心链路 scan → brainstorm → plan → execute → verify → archive 设计正确，但存在严重的用户体验问题：

1. **每阶段都需要用户手动推进**：`sillyspec run <stage>` + `sillyspec run <stage> --done`，用户是流程的变速箱
2. **brainstorm 频繁请示用户**：实现细节级别的选择也问用户确认，导致决策疲劳
3. **阶段产物以聊天形式回显**：brainstorm 完整输出到对话，同一段内容消耗两次 token（生成 + 回显）
4. **没有风险分级**：修改文案和修改数据库走同样的确认流程
5. **现有的 `sillyspec run quick`** 只跳过全部流程，缺少"自动走完整流程但减少用户介入"的中间地带
6. **现有的 auto-mode change（2026-04-08）** 是纯 skill 实现，在 agent 侧循环调用 CLI，无法在 CLI 层面控制自动推进

### 核心矛盾
**内部治理精度与用户操作成本的矛盾。**

SillySpec 的价值在于严格的阶段链路和产物校验，但这些不该暴露给用户。用户只关心：需求进去了，结果出来了。

## 2. 设计目标

### 一句话
**内部精密，用户极简。**

### 具体目标
- 用户默认只需一个命令启动，一个摘要结束
- 阶段自动推进，不人工操作 CLI
- 确认从"流程闸"改为"风险闸"
- brainstorm 产出结构化 artifact，不回显正文
- 三种模式按变更规模匹配流程复杂度

### 非目标
- 不删减内部阶段
- 不降低产物质量要求
- 不取消用户对高风险变更的确认权

## 3. 用户视角

### 新命令
```
sillyspec run auto  "<需求>"     # 默认推荐，自动走完整流程
sillyspec run quick "<任务>"     # 现有，跳过流程直接做（小改动）
sillyspec run full  "<需求>"     # 完整流程 + 更多检查（大改动）
```

### 用户看到的东西

**auto 模式最终输出：**
```
✅ 需求：新增用户导出功能
📝 设计已生成（3 个决策，0 个待确认）
📋 任务已拆分（5 个任务）
🔧 实现已完成
✅ 验证通过（单元测试 + lint）
📦 变更已应用（4 个文件，低风险）
📄 影响模块：user-management
```

**如果需要用户介入：**
```
⚠️ 需要确认以下决策：

Q-001 [business_decision]: 导出的 Word 模板是否需要支持多人共享？
  选项：仅个人模板 / 工作区共享模板 / 两者都支持
  推荐：工作区共享模板

请选择或输入其他方案。
```

### 用户不再看到的东西
- `请确认 brainstorm`
- `请确认 plan`
- brainstorm 的完整正文输出
- `sillyspec run <stage> --done` 的手动操作
- 实现细节级别的选择题

## 4. 内部流程

### 4.1 auto 模式内部链路
```
sillyspec run auto "<需求>"
  ↓
① Classify Change（新增内部步骤）
  - 判断变更规模：quick / auto / full
  - 如果命中 quick → 降级到 sillyspec run quick
  ↓
② Scan Cache Check
  - scan 缓存是否新鲜（< 24h 且无相关文件改动）
  - 新鲜 → 复用
  - 过期 → scan-lite（增量扫描）
  ↓
③ Brainstorm (artifact-first)
  - 不回显正文，直接写文件
  - 产出：design.md, decisions.md, gaps.md, assumptions.md, next-action.json
  - 只有 blocking questions 才 wait 用户
  - 详见 brainstorm-contract.md
  ↓
④ Plan Postcheck（新增内部步骤）
  - 校验 brainstorm 产物完整性
  - 如果发现 gaps/decisions/risk-profile 缺失 → 回退到 brainstorm 补齐
  - 详见 plan-postcheck.md
  ↓
⑤ Plan
  - 读取 next-action.json 确定推进方向
  - 拆分任务，产出 plan.md / tasks.md
  ↓
⑥ Execute
  - 按任务列表执行
  ↓
⑦ Verify
  - 根据风险等级决定验证强度
  - 详见 risk-gates.md
  ↓
⑧ Apply & Archive
  - 低风险 → 自动 apply + archive
  - 高风险 → 展示摘要，等用户确认后 apply
  ↓
⑨ Summary
  - 输出最终摘要
```

### 4.2 full 模式差异
相比 auto：
- scan 使用 deep 模式（不依赖缓存）
- brainstorm 不跳过任何决策，P1 级也标记展示
- execute 使用 worktree 隔离
- verify 验证强度更高
- apply 必须用户确认

### 4.3 quick 模式（现有，不变）
- 跳过 brainstorm/plan，直接执行
- 只做轻量 verify-lite
- 无 apply 决策（直接在主工作区）

## 5. 模式边界

### 自动分类规则（Classify Change）
```
命中 quick（降级）：
- 文案修改、UI 样式调整
- 单文件 bug fix（< 50 行改动）
- 纯配置/文档变更
- 用户显式指定 --quick

命中 auto（默认）：
- 单模块功能新增
- API endpoint 新增
- 组件重构（< 3 个文件）
- bug fix 涉及逻辑变更

命中 full：
- 跨模块变更（> 3 个模块）
- 数据库 schema 变更
- 鉴权/权限系统改动
- 公共 API contract 变更
- 引入新架构模式
- 用户显式指定 --full
```

### 分类依据
- 用户显式指定优先级最高
- 然后根据需求描述的关键词匹配
- agent 分类结果写入 change 元数据，可被后续阶段读取

## 6. 产物目录结构

### brainstorm 产物
```
.sillyspec/changes/<change>/brainstorm/
  design.md              # 设计文档（artifact-first，不在对话回显）
  decisions.md           # 决策记录（含 AUTO_DECIDED 标记）
  gaps.md                # 缺口分析
  assumptions.md         # 隐含假设
  risk-profile.json      # 风险画像（结构化）
  next-action.json       # 下一步动作指示（关键产物）
```

### 与现有结构的关系
- 保持 `.sillyspec/changes/<change>/` 的现有结构
- brainstorm 产物新增子目录 `brainstorm/`
- plan 产物仍在 `plan.md` / `tasks.md`
- 不改变现有 scan / archive 的产物结构

## 7. 与现有代码的关系

### 需要修改的模块
- `src/run.js` — 新增 auto / full 模式入口，阶段自动推进逻辑
- `src/stages/brainstorm.js` — artifact-first 改造，step prompt 修改
- `src/stages/plan.js` — 读取 next-action.json，减少人工确认
- `src/stages/index.js` — 注册新阶段
- `src/change-risk-profile.js` — 扩展为统一风险判断（P0/P1/P2）
- `src/stage-contract.js` — 新增 brainstorm → plan 的自动过渡校验

### 新增模块
- `src/stages/auto.js` — auto 模式主流程编排
- `src/classify-change.js` — 变更规模分类
- `src/brainstorm-postcheck.js` — brainstorm 产物完整性校验

### 不需要修改
- `src/stages/quick.js` — 现有，保持不变
- `src/stages/scan.js` — 现有，保持不变
- `src/stages/execute.js` — 基本不变，auto 模式编排在 auto.js 层
- `src/stages/verify.js` — 基本不变，但读取 risk-profile.json 决定验证强度
- `src/stages/archive.js` — 基本不变，auto 模式自动触发

## 8. 测试方向

1. **brainstorm next-action.json 生成**：给定不同需求场景，验证 blocking_questions 是否正确识别
2. **plan-postcheck 回退逻辑**：模拟残缺 brainstorm 产物，验证能否触发回退
3. **auto 模式端到端**：从 `sillyspec run auto` 到 summary，验证自动推进
4. **风险闸拦截**：模拟 P0 风险变更，验证用户确认触发
5. **classify-change**：不同需求描述的分类准确性
6. **worktree apply 条件**：低/中/高风险的 apply 行为差异
