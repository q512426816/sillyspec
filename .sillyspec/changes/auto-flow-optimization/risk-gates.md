# auto-flow-optimization — 风险闸设计

author: qinyi
created_at: 2026-06-26 12:00

## 1. 设计原则

**风险闸替代流程闸。**

- 现在：每个阶段结束都可能触发 `[WAIT_FOR_USER]`，用户是每个流程节点的审批人
- 改后：只有 P0 级风险才阻塞用户确认，P1 自动推进但记录，P2 静默通过
- 确认时机从"阶段切换时"变为"风险触发时"

## 2. 风险等级定义

### P0 — 阻塞确认（必须用户确认才能继续）

适用以下任一条件：

```
R-001: 删除数据（DROP TABLE / DELETE WHERE 无 limit / 清空集合）
R-002: 数据库 migration（新增列、改类型、改索引、改约束）
R-003: 鉴权/权限改动（登录流程、token 验证、角色系统、访问控制）
R-004: 支付/资金相关（支付接口、价格计算、退款逻辑）
R-005: 生产配置改动（环境变量、连接串、密钥、feature flag 开关）
R-006: 大规模删除/重命名（> 5 个文件删除 或 > 3 个文件重命名）
R-007: agent 扩大 allowed_paths（影响安全边界）
R-008: verify 失败后仍想继续（用户主动选择忽略失败）
R-009: 需求目标不清晰（brainstorm 无法确定要做什么）
R-010: 多个互斥方案且影响架构/数据/接口/权限/兼容性
```

### P1 — 自动推进但标记（不阻塞，记录到 decisions.md）

适用以下任一条件：

```
R-101: 跨模块调用（改动影响 > 1 个模块的公共接口）
R-102: API contract 变化（REST/GraphQL/事件接口的入参/出参/错误码变更）
R-103: 新增 npm/pip 等外部依赖
R-104: 修改公共函数签名（exported function 的参数、返回值、抛出行为）
R-105: 修改核心模块（workflow / daemon / session / lifecycle / state-machine）
R-106: 重命名公共符号（exported const/function/class/type）
R-107: 引入新的全局状态或副作用
```

### P2 — 自动通过（不记录，不阻塞）

```
R-201: 文案修改
R-202: UI 样式微调（CSS/样式属性）
R-203: 单测补充
R-204: 错误提示优化
R-205: 日志级别/格式调整
R-206: 类型修复（TypeScript 类型标注修正）
R-207: 变量/函数重命名（非 exported）
R-208: 代码重构（抽函数、拆文件，不改变行为）
R-209: 文档同步
R-210: 代码注释
```

## 3. 风险检测规则

### 3.1 基于文件路径的检测
```
触发 P0 的文件路径关键词：
  /migration/ /migrations/
  /schema/ + .sql/.prisma/.ts
  /auth/ /permission/ /role/
  /payment/ /billing/ /stripe/
  .env .env.* config.*.yaml config.*.json
  Dockerfile docker-compose.*

触发 P1 的文件路径关键词：
  /routes/ /controllers/ /handlers/（API 层）
  /models/ /entities/（数据模型层）
  /services/（业务逻辑层，非自身模块）
  index.ts index.js（re-export 入口）

触发 P2 的文件路径关键词：
  *.test.ts *.test.js *.spec.ts *.spec.js
  *.stories.tsx *.stories.ts
  *.css *.scss *.less
  README* CHANGELOG*
```

### 3.2 基于 git diff 的检测
```
P0 触发：
  diff 中包含 DELETE FROM / DROP TABLE / TRUNCATE
  diff 中包含新增 require/import 未在现有 lockfile 中
  diff 中包含 /api/ /auth/ /payment/ 路径的新增或修改
  diff 中包含 .env 变更
  diff 涉及被 protected files 列表包含的文件

P1 触发：
  diff 中包含 export function/addEventListener 的签名变更
  diff 涉及 > 3 个模块的文件
  diff 中新增了 package.json dependencies
```

### 3.3 基于 brainstorm 决策的检测
```
P0 触发（来自 next-action.json）：
  has_blocking_questions === true
  decisions 中有 type 为 "architecture" 且未 resolved 的条目
  assumptions 中包含 "假设现有数据格式不变" 但未验证

P1 触发（来自 decisions.md）：
  decisions 中有 AUTO_DECIDED 标记但 decision_level 为 high
```

## 4. risk-profile.json 结构

```jsonc
{
  // 风险等级：P0 / P1 / P2
  "level": "P1",

  // 触发的风险规则 ID 列表
  "triggers": ["R-101", "R-104"],

  // 评估依据
  "assessed_from": [
    {
      "source": "file_path",
      "pattern": "/routes/",
      "matched_files": ["src/routes/user.ts"]
    },
    {
      "source": "brainstorm_decision",
      "decision_id": "D-003",
      "reason": "公共 API 签名变更"
    }
  ],

  // 应用本次变更前需要满足的前置条件（P0 时才有）
  "prerequisites": [],

  // 自动 apply 条件（用于 execute 后的 apply 决策）
  "can_auto_apply": true,
  "apply_reason": "verify 通过，无 P0 触发，无 protected files",
  "apply_blockers": []
}
```

## 5. apply 决策规则

### 5.1 自动 apply 条件
同时满足以下所有条件：
```
1. verify 通过（或 verify-lite 通过）
2. risk_profile.level !== "P0"
3. 变更文件全部在 allowed_paths 内
4. 无 protected files 修改（protected files 列表来自 .sillyspec/local.yaml）
5. 无 baseline conflict
6. apply_blockers 为空
```

### 5.2 展示摘要后 apply（中风险）
```
满足自动 apply 前提，但以下任一条件：
- risk_profile.level === "P1"
- 触发了 > 2 个 P1 规则
- 改动文件 > 10 个

行为：输出变更摘要 + 风险标记，不阻塞，3 秒后自动 apply
```

### 5.3 阻断 apply（高风险）
```
以下任一条件：
- risk_profile.level === "P0"
- verify 失败
- 有 protected files 修改
- 有 baseline conflict
- apply_blockers 非空

行为：输出变更详情，wait 用户确认
```

### 5.4 不看 diff 数量
> **设计约束 D-004**：worktree auto apply 不使用简单 diff 行数阈值。
> 改了一个 200 行的大函数和改了 200 个文件各一行，前者风险高得多。
> 风险判断基于 risk-profile.json，不基于 diff 统计。

## 6. protected files 配置

在 `.sillyspec/local.yaml` 中新增：
```yaml
protected_files:
  - ".env"
  - ".env.*"
  - "package.json"      # 依赖变更走 P0
  - "tsconfig.json"
  - "vite.config.*"
  - "prisma/schema.*"
```

protected files 出现在变更中时，apply 必须用户确认。

## 7. 与现有 change-risk-profile.js 的关系

现有 `change-risk-profile.js` 已有 `detectChangeRisk()` 函数，基于关键词检测 integration-critical 等级。

改进方案：
- 扩展为 P0/P1/P2 三级
- 新增文件路径检测
- 新增 git diff 检测
- 新增 brainstorm 产物检测
- 产出结构化的 risk-profile.json 而非仅 level + triggers

现有代码的 `INTEGRATION_CRITICAL_PATTERNS` / `INTEGRATION_FILE_PATTERNS` 可复用为 P0 的子集。
