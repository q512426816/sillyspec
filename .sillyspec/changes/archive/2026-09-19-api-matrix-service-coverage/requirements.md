---
author: qinyi
created_at: 2026-09-18 21:56:19
generated_by: sillyspec-fourpiece-init
---
# 需求规格（Requirements）

## 角色
| 角色 | 说明 |
|---|---|
| agent（执行者） | 填写 verify-result.md 接口矩阵判定/证据的人类代理 |
| verify 门禁（CLI） | judgeApiCoverageMatrix 校验器 |

## 功能需求

### FR-01: covered-service 判定形态满足覆盖等式
Given verify-result.md 接口验证覆盖矩阵中某端点行判定为 covered-service 且证据列含真实测试锚点（`.test.` / file:line / 反引号形态）
When verify `--done` 门禁执行 judgeApiCoverageMatrix
Then 该行计入覆盖分子（covered+covered-service == 有效分母时放行），不触发移交联动（partial/uncovered 专用）与 PASS 封顶降级，warnings 含「N 端点由 service 层测试承接（非端点级）」advisory 计数。

### FR-02: 测试锚点硬约束与八面文案同源
Given 某端点行判定为 covered-service 而证据列缺测试锚点
When verify 门禁执行
Then error 阻断（与 non-testable 缺理由同 fail-closed 级）；且骨架/指引/模板/门禁错误文案/anchor-check/--init 提示八个文案面全部呈现五枚举口径（covered/covered-service/partial/uncovered/non-testable），probe7 侧 anchor-check 预检不跳过 covered-service 行。

## 非功能需求
- 兼容性：存量四枚举文档校验行为逐字不变；factsExpected=false 入口兼容路径不变；回退（白名单移除）显式可见不留静默面。
- 平台：零新正则零路径拼接（Windows/macOS/Linux 无差）。

## 决策覆盖矩阵（如存在 decisions.md）
| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001@v1 | FR-01, FR-02 | 形态语义/记账/锚点约束/advisory |
| D-002@v1 | FR-02 | 白名单两矩阵共用联动 |
| D-003@v1 | FR-01, FR-02 | 方案 A 落定 |
