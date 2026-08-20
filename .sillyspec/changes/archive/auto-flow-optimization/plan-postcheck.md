# auto-flow-optimization — plan 对 brainstorm 的校验

author: qinyi
created_at: 2026-06-26 12:00

## 1. 目的

plan 阶段不能盲目拆任务。必须在拆任务之前，校验 brainstorm 产物的完整性。如果发现遗漏或矛盾，应回退到 brainstorm 补齐，而不是带着残缺设计一路走到 execute。

## 2. 校验时机

```
brainstorm 完成
  ↓
plan-postcheck（新增内部步骤）
  ↓ 校验通过
plan 开始拆任务
  ↓ 校验不通过
回退到 brainstorm 补齐
```

在 auto 模式中，这是 brainstorm → plan 之间的门禁。
在手动模式中，如果用户直接执行 `sillyspec run plan`，也应该自动触发 postcheck。

## 3. 校验清单

### 3.1 产物完整性检查

```yaml
必填文件：
  - brainstorm/design.md
  - brainstorm/decisions.md
  - brainstorm/gaps.md
  - brainstorm/assumptions.md
  - brainstorm/next-action.json

缺失任一文件 → 校验失败，错误级别：ERROR
```

### 3.2 next-action.json 有效性检查

```yaml
必填字段：
  - status（合法值：ready_for_plan / waiting_for_user）
  - has_blocking_questions（布尔值）
  - decision_level（合法值：high / medium / low）

状态一致性：
  - status === "waiting_for_user" 时，has_blocking_questions 必须为 true
  - status === "ready_for_plan" 时，has_blocking_questions 必须为 false
  - 有 blocking_reasons 时，has_blocking_questions 必须为 true

不一致 → 校验失败，错误级别：ERROR
```

### 3.3 design.md 覆盖度检查

plan 在拆任务前，验证 design.md 覆盖了以下维度：

```yaml
必须覆盖的维度（缺失任一 → WARNING，不阻塞但标记）：
  D-设计目标: design.md 中是否有明确的需求描述（不等同于用户原话，是 agent 理解后的描述）
  D-影响范围: design.md 中是否列出了受影响的模块/文件
  D-技术方案: design.md 中是否有实现方案描述（不能只是"待定"）
  D-验收标准: design.md 中是否有可验证的完成条件

弱覆盖检测（存在关键词但内容空洞 → WARNING）：
  - 有"影响模块"标题但内容为空或只有 TBD
  - 有"技术方案"标题但只有一句话且无具体文件路径
  - 有"验收标准"但全是不具体的描述（如"功能正常"）
```

### 3.4 gaps.md 覆盖度检查

```yaml
关键缺口必须被识别（缺失 → WARNING，可能导致回退）：
  G-边界场景: 是否分析了边界/异常情况
  G-向后兼容: 是否考虑了现有功能的影响
  G-测试策略: 是否提到了验证方式（即使只是"需要单元测试"）

gaps.md 中标记为 BLOCKER 的缺口 → ERROR，必须回退到 brainstorm 解决
gaps.md 为空 → WARNING（可能 agent 没仔细分析）
```

### 3.5 assumptions.md 风险检查

```yaml
高风险假设（存在但未验证 → WARNING）：
  A-数据格式: "假设现有数据格式不变"
  A-第三方API: "假设第三方 API 行为不变"
  A-性能: "假设性能可接受，不需要优化"

这些假设需要后续在 execute 或 verify 中验证，
但不会阻塞 plan，只在 plan-postcheck 中标记。
```

### 3.6 decisions.md 一致性检查

```yaml
一致性规则：
  - decisions.md 中的 AUTO_DECIDED 必须有 reason 字段
  - AUTO_DECIDED 的 reason 必须引用自动决策 checklist 项（AC-001 等）
  - decisions.md 中的 NEEDS_REVIEW 决策必须引用风险闸规则（R-xxx）
  - next-action.json.questions 中的每个问题，必须在 decisions.md 中有对应条目

不一致 → ERROR
```

## 4. 校验结果处理

### 4.1 结果分类

```
PASS: 所有检查通过 → 继续进入 plan
WARN: 有 WARNING → 继续进入 plan，但在 plan.md 中记录警告项
FAIL: 有 ERROR → 回退到 brainstorm，携带具体的补齐要求
```

### 4.2 WARN 的处理

```yaml
plan 阶段看到 warning 后：
  1. 在 plan.md 开头记录 "## Plan Postcheck Warnings"
  2. 列出所有 warning 项
  3. 在拆任务时，为每个 warning 分配一个"补齐"任务
  4. 不阻塞，继续拆其余任务
```

示例：
```markdown
## Plan Postcheck Warnings

- [W-001] design.md 验收标准不够具体："功能正常" → 补充可测试的验收条件
  - 对应任务：T-005（补充验收标准）
- [W-002] gaps.md 为空 → brainstorm 可能遗漏了边界场景分析
  - 对应任务：T-006（补充边界场景测试用例）
```

### 4.3 FAIL 的处理

```
FAIL 时：
1. 输出具体的错误信息
2. 生成补齐清单（要 brainstorm 补什么）
3. 将补齐清单写入 brainstorm/next-action.json
4. 回退到 brainstorm 阶段
5. brainstorm 从上次的 artifact 继续（不从头开始）
```

示例补齐清单：
```jsonc
{
  "status": "waiting_for_brainstorm_retry",
  "retry_reason": "plan-postcheck FAIL",
  "missing_items": [
    {
      "id": "MISS-001",
      "type": "missing_file",
      "description": "brainstorm/decisions.md 不存在"
    },
    {
      "id": "MISS-002",
      "type": "incomplete_design",
      "description": "design.md 缺少技术方案描述",
      "hint": "需要补充具体实现方案，包括涉及的文件和修改方式"
    }
  ]
}
```

### 4.4 回退流程

```
plan-postcheck FAIL
  ↓
更新 next-action.json（添加 missing_items）
  ↓
设置 progress.currentStage = "brainstorm"
  ↓
重新执行 brainstorm（读取 next-action.json 中的 missing_items，定向补齐）
  ↓
brainstorm 完成 → 再次触发 plan-postcheck
  ↓
最多重试 2 次（防止无限循环）
  ↓
第 3 次仍 FAIL → 输出错误，wait 用户介入
```

## 5. 实现方式

### 新增文件：`src/brainstorm-postcheck.js`

```javascript
/**
 * 校验 brainstorm 产物完整性
 * @param {string} changeDir - 变更目录路径
 * @returns {{ ok: boolean, level: 'PASS'|'WARN'|'FAIL', errors: string[], warnings: string[] }}
 */
export function checkBrainstormArtifacts(changeDir) { ... }
```

### 与 stage-contract.js 的关系

现有 `stage-contract.js` 提供 `StageContract` 验证器，每个阶段声明 allowedFrom / validators。

新增 plan-postcheck 作为 brainstorm → plan 过渡的隐式验证器：
- 不在 plan.js 的步骤列表中
- 在 auto.js 编排层和 plan.js 初始化时自动触发
- 如果是手动 `sillyspec run plan`，也在 plan 初始化时触发

## 6. 测试方向

1. **正常通过**：完整 brainstorm 产物 → PASS
2. **缺失文件**：缺少 decisions.md → FAIL
3. **弱覆盖**：design.md 只有标题无内容 → WARN
4. **不一致**：next-action.json says ready 但 decisions.md 缺失 → FAIL
5. **回退补齐**：FAIL 后 brainstorm 补齐 → 再次 PASS
6. **无限循环防护**：连续 FAIL 3 次 → wait 用户
