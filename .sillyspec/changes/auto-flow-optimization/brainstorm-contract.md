# auto-flow-optimization — brainstorm 新契约

author: qinyi
created_at: 2026-06-26 12:00

## 1. 核心改变

### 现在
- brainstorm 的 step prompt 要求 agent 在对话中输出完整设计内容
- 然后再写入文件
- 每个设计选择都可能触发 `[WAIT_FOR_USER]`
- 用户看到大量中间产物

### 改后
- brainstorm 直接写文件，不在对话中输出正文
- 对话中只输出简短摘要（文件路径 + 2-3 句话）
- 只有 blocking questions 才触发 wait
- 下游阶段通过读取文件获取信息

## 2. artifact-first 规则

### 写作规则
```
1. brainstorm 产出直接写入文件，不先在对话中输出完整内容
2. 对话中只输出：文件路径 + 2-3 句话摘要
3. 示例对话输出：
   "已生成 design.md — 新增用户导出功能，采用现有 file-export 模块扩展方案"
   "已生成 decisions.md — 3 个决策，2 个自动选择，1 个待确认"
```

### 产物文件清单
```
.sillyspec/changes/<change>/brainstorm/
  design.md          # 设计文档（必填）
  decisions.md       # 决策记录（必填）
  gaps.md            # 缺口分析（必填）
  assumptions.md     # 隐含假设（必填）
  risk-profile.json  # 风险画像（必填，由 CLI 生成）
  next-action.json   # 下一步指示（必填，由 agent 生成）
```

## 3. next-action.json 规范

### 结构定义

```jsonc
{
  // 状态
  "status": "ready_for_plan" | "waiting_for_user",

  // 决策级别（设计约束 D-001：不使用数值 confidence）
  "decision_level": "high" | "medium" | "low",

  // 是否有阻塞用户的问题
  "has_blocking_questions": true | false,

  // 阻塞原因（如果有）
  "blocking_reasons": [
    "需求目标不清晰：'导出功能' 未指定期望格式（CSV/Excel/Word）"
  ],

  // 需要用户输入的问题列表（空数组 = 可自动推进）
  "questions": [
    {
      "id": "Q-001",
      "type": "business_decision",
      "question": "导出的 Word 模板是否需要支持多人共享？",
      "options": ["仅个人模板", "工作区共享模板", "两者都支持"],
      "recommended": "工作区共享模板"
    },
    {
      "id": "Q-002",
      "type": "requirement_clarification",
      "question": "导出是否需要支持筛选条件（如日期范围、状态）？",
      "options": ["不需要，导出全部", "需要基础筛选", "需要高级筛选"],
      "recommended": "需要基础筛选"
    }
  ],

  // 自动决策列表（已由 agent 决定的选项）
  "auto_decisions": [
    {
      "id": "D-001",
      "decision": "使用现有 file-export 模块扩展，不新建独立导出服务",
      "reason": "项目已有 file-export 模块，复用可减少代码重复"
    },
    {
      "id": "D-002",
      "decision": "导出格式使用 docx 库，不使用 HTML 转 Word 方案",
      "reason": "docx 库已存在于 package.json dependencies"
    }
  ]
}
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| status | string | `ready_for_plan` 表示可自动进入 plan；`waiting_for_user` 表示有阻塞问题 |
| decision_level | enum | `high` = 有架构级决策；`medium` = 有非平凡选择；`low` = 全部自动决定 |
| has_blocking_questions | boolean | 是否有需要用户回答的问题。这是推进/等待的**唯一判断依据** |
| blocking_reasons | string[] | 阻塞原因的可读描述，展示给用户 |
| questions | object[] | 需要用户回答的问题，`status=waiting_for_user` 时非空 |
| auto_decisions | object[] | agent 自动做出的决策，已记录到 decisions.md |

### 关于 decision_level

> **设计约束 D-001**：不使用 0.52 / 0.86 这样的数值 confidence。
> 原因：agent 对自身判断的置信度不可靠，数值精度是虚假的。
> `decision_level` 枚举（high/medium/low）用于风险分级参考，不作为推进判断依据。
> **推进判断的唯一依据是 `has_blocking_questions`。**

## 4. 自动决策规则

### 设计约束 D-002：自动决策必须基于 checklist

agent 不能说"我觉得影响不大"。必须逐条检查以下 checklist：

#### 自动决策 checklist（全部命中才可自动决策）

```
AC-001: 未修改公共 API 入参/出参/错误码
AC-002: 未修改数据库 schema
AC-003: 未涉及鉴权/权限/登录流程
AC-004: 未扩大 allowed_paths
AC-005: 未引入新的外部依赖
AC-006: 未修改核心模块（workflow / daemon / session / lifecycle）
AC-007: 已有项目约定可复用（conventions / module-map / knowledge）
AC-008: 不影响向后兼容性
AC-009: 不涉及数据迁移或格式变更
AC-010: 单模块范围内可完成
```

#### 自动决策判定流程

```
1. 逐条检查 AC-001 ~ AC-010
2. 如果全部 ✅ → 可以自动决策，标记 AUTO_DECIDED
3. 如果任一 ❌ → 评估是否为 blocking
   - 涉及架构/数据/接口/权限/兼容性 → blocking，写入 questions
   - 其他 → 写入 decisions.md 标记为 NEEDS_REVIEW（不阻塞，但标记）
```

#### decisions.md 中的标记

```markdown
## D-001: 使用现有 file-export 模块
- 决策：复用现有模块
- 状态：AUTO_DECIDED
- 依据：AC-007 ✅（项目已有 file-export 约定）

## D-003: API 返回新增 export_status 字段
- 决策：在现有 response DTO 中追加字段
- 状态：NEEDS_REVIEW
- 原因：AC-001 ❌（修改公共 API 出参）
```

## 5. 何时问用户

### 必须问（生成 question 到 next-action.json）
```
- 需求目标不清晰（brainstorm 无法确定要做什么）
- 有多个互斥方案，且会影响架构或长期维护
- 涉及破坏性变更：删除数据、改 DB schema、改鉴权、改支付、改权限
- agent 无法判断业务语义（"这个字段对业务意味着什么？"）
- 继续做可能扩大范围（scope creep）
```

### 不要问（直接 AUTO_DECIDED）
```
- 只是实现细节（怎么命名、文件放哪、怎么组织代码）
- 只是文件组织方式
- 只是测试怎么补
- 只是命名、抽函数、错误处理、日志、文档同步
- 已有项目约定能决定
- checklist 全部通过
```

## 6. brainstorm 完成后的推进

### 自动推进条件
```
next-action.json.status === "ready_for_plan"
  AND
next-action.json.has_blocking_questions === false
```

### 自动推进行为
```
auto 模式：自动进入 plan 阶段
full 模式：展示 brainstorm summary 后自动进入 plan
手动模式：输出 summary，等用户执行 sillyspec run plan
```

### 等待用户条件
```
next-action.json.status === "waiting_for_user"
  AND
next-action.json.has_blocking_questions === true
```

### 等待用户行为
```
输出 next-action.json.questions 中的问题
等待用户回答
用户回答后，更新 next-action.json（移除已回答的 question，更新 auto_decisions）
重新检查是否还有 blocking questions
如果无 → 自动推进到 plan
```

## 7. brainstorm step 改造要点

现有 brainstorm.js 的 step prompt 需要：
1. 去掉"请确认"相关的指令
2. 加入 artifact-first 写作规则
3. 加入自动决策 checklist
4. 加入 next-action.json 生成规范
5. 保留"加载上下文 → 分析需求 → 识别模块"的核心逻辑

步骤数可能从现有的 ~6 步简化为 ~4 步：
```
Step 1: 状态检查 + 加载上下文（合并现有 Step 1+2）
Step 2: 需求分析 + 模块匹配（核心分析）
Step 3: 产出 artifact（design.md + decisions.md + gaps.md + assumptions.md）
Step 4: 生成 next-action.json + 推进判断
```

## 8. 与现有 brainstorm-archive 的关系

现有的 `.sillyspec/changes/brainstorm-archive/` 是 brainstorm 产物的存档方案。
auto-flow-optimization 的 brainstorm 产物目录结构与之兼容：
- brainstorm 产物写入 `brainstorm/` 子目录
- archive 时整体迁移，不影响现有 archive 逻辑
