---
author: qinyi
created_at: 2026-09-18 08:10:00
---

# 需求规格（Requirements）

## 角色
| 角色 | 说明 |
|---|---|
| 开发者（agent） | 探针结果的消费者——漂移/漏发 warning 的复核者 |
| 工具（CLI） | 探针执行方：diff 取数+提取+对账+骨架渲染 |

## 功能需求

### FR-01: probe8 diff 源替换
覆盖决策：D-001@v1
Given worktree 可用
When collectProbe8DiffFiles 取数
Then 主仓 git diff baseline..HEAD ∪ porcelain + 全注册仓循环双源；分类规则产出 frontend/backend/other

Given worktree 缺失（in-place）
When 取数
Then 主仓 git diff HEAD~1..HEAD ∪ porcelain（含已提交窗口）

Given git 全失败
When 取数
Then design 清单源 fallback + 模式注记

Given design 清单有但 diff 无的路径
When 渲染
Then advisory 注记行列出（不参与对账不阻断）

### FR-02: 代码级字段直比
覆盖决策：D-002@v1, D-003@v1, D-006@v1
Given .js/.ts/.jsx/.tsx 前端文件
When extractFrontendPayloadFields
Then formData./payload. 字段名 + 请求调用 8 行窗口内 DTO 字面量键 + name 属性

Given .vue / .wxml
When 提取
Then v-model/prop / value绑定/data-xxx

Given .java Controller
When extractBackendFields 两趟
Then 端点（类级+方法级拼接）+ @RequestParam 参数名（required=false 排除/value 取注解名）+ @RequestBody 类型→二趟全仓字段集 + 必填三形态

Given 前端字段 ∉ backendAllFields（全仓并集）
When comparePayloadFields
Then driftWarnings 含 file/line/field

Given 后端端点 requiredFields ∋ 字段 ∉ 前端发送集
When 对账
Then missingRequiredWarnings 含 endpoint/method/field/frontendFiles

Given URL→端点关联
When 匹配
Then 段边界后缀判定（/orders 命中 /api/v1/orders 不误命中 /rporders）

### FR-03: 骨架渲染与 advisory 档
覆盖决策：D-004@v1
Given probe8 渲染
When direct-compare 子段
Then 命中统计行+逐条明细行（文件:行号+说明）；全部 advisory 不阻断；渲染行不误中 verify-postcheck PROBE8 系锚点

Given 文件含 probe8-skip（前端或后端）
When 提取
Then 跳过+计数

Given 非 Java 后端文件
When 提取
Then nonJavaSkip 计数

## 非功能需求
- 兼容性：非 Java 变更零 warning 零阻断；无前端面子段注记；既有 design 契约面零改动；probe1-7/9 不动
- 可回退：子段=if 块删除；diff 源=返回 design-list 即回退
- 可测试：提取/对账纯函数+真实形态夹具

## 决策覆盖矩阵
| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001@v1 | FR-01 | diff 源替换 |
| D-002@v1 | FR-02 | 代码级直比 |
| D-003@v1 | FR-02 | 必填三形态 |
| D-004@v1 | FR-03 | advisory 档 |
| D-005@v1 | 边界 | 非目标 |
| D-006@v1 | FR-02 | probe8 内子段 |
