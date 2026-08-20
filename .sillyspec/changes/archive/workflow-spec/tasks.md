---
author: qinyi
created_at: 2026-06-03T10:22:00+08:00
---

# Workflow Spec 执行计划

## 背景

解决 scan 阶段子代理落盘失败（实测 2/4）无法自动发现、多项目扫描遗漏等问题。
核心目标：把"口头完成"变成"可验证完成"。

## 任务列表

### Phase 0：workflow schema + post_check runner
**目标**：scan 跑完后代码自动检查产物，失败时明确报错

- [ ] **T0-1** 定义 workflow YAML schema（`src/workflow-schema.js`）
  - 输入：roles / outputs / checks / retry / permissions
  - 验证：YAML 解析 + schema 校验
- [ ] **T0-2** 实现 post_check runner（`src/workflow-check.js`）
  - 检查类型：file_exists / min_lines / contains_sections / no_empty_files
  - 两级检查：role_level（单个角色）+ workflow_level（全局）
  - 输出：结构化报告（role id + 失败原因 + 目标路径）
- [ ] **T0-3** scan step 5 后接入 post_check
  - scan 仍按现有 prompt 跑，主 agent 仍负责调度子代理
  - 跑完后 run.js 调用 workflow-check，输出检查报告
  - 检查失败 → 输出具体失败项，主 agent 根据报告重试
- [ ] **T0-4** 编写 `.sillyspec/workflows/scan-docs.yaml`
  - 定义 sillyspec 和 dashboard 两个项目的扫描角色
  - 定义 outputs、checks、retry 策略
- [ ] **T0-5** 测试验证
  - 对 dashboard 跑 scan，验证 post_check 能发现缺失文件
  - 模拟子代理失败场景，验证检查报告准确

### Phase 1：role-level checks + failed role retry prompt
**目标**：按角色定位失败，自动生成带失败证据的重试 prompt

- [ ] **T1-1** 增强 post_check 输出
  - 按 role id 汇总检查结果
  - 输出格式：`❌ role "arch" — ARCHITECTURE.md 不存在`
- [ ] **T1-2** 实现重试 prompt 生成器
  - 自动携带：失败角色 ID、失败原因、目标路径
  - 只重试失败角色，不重跑成功的
- [ ] **T1-3** scan 流程接入重试
  - post_check 失败后自动输出重试 prompt
  - 主 agent 只需执行重试 prompt

### Phase 2：scan step 5 引用 workflow spec
**目标**：scan prompt 不再硬编码子代理分配，从 YAML 读取

- [ ] **T2-1** scan step 5 改为引用 workflow 名称
  - prompt 只说"按 scan-docs workflow 执行"
  - 主 agent 从 YAML 读取角色定义和约束
- [ ] **T2-2** 修复多项目 Step 7/8 遗漏问题
  - Step 7/8 prompt 加强制要求："每个项目必须逐个汇报执行结果"
  - 结合 post_check 自动兜底

### Phase 3：run.js 代码生成 role prompts
**目标**：Level 2，代码生成 prompt 不再靠 AI 理解

- [ ] **T3-1** run.js 加载 workflow YAML
- [ ] **T3-2** 根据 role 定义生成各角色的独立 prompt
- [ ] **T3-3** 替换 scan step 5 的手写 prompt

### Phase 4：archive impact extraction workflow
**目标**：验证模式可复用

- [ ] **T4-1** 编写 `.sillyspec/workflows/archive-impact.yaml`
  - write_mode: patch_only
- [ ] **T4-2** archive 阶段引用 workflow
- [ ] **T4-3** 对比 subagent / workflow 两种方式的可靠性

### Phase 5：executor adapter（远期，不承诺时间）
**目标**：Level 3/4，SillySpec runtime 直接调度 agent

- [ ] **T5-1** 抽象 executor 接口
- [ ] **T5-2** Local adapter（Node.js 调 agent CLI）
- [ ] **T5-3** Claude Dynamic Workflow adapter（如稳定）
- [ ] **T5-4** Codex adapter（如需要）

## 执行约束

- 每完成一个 Phase 做一轮测试验证
- 不改动现有 stage 生命周期
- 不绑定 Claude Code
- Phase 0-2 只改 run.js + 新增文件，不重构现有架构
