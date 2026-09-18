---
plan_level: full
---

# 实现计划（Plan）— 2026-09-18-probe8-direct-compare

## Wave 1（基础）
- task-01

## Wave 2（依赖 W1）
- task-02

## Wave 3（依赖 W2）
- task-03

## Wave 4（依赖 W3）
- task-04

## Wave 5（依赖 W4）
- task-05

## Wave 6（依赖全部）
- task-06

## 任务总表
| 编号 | 任务 | Wave | 优先级 | 依赖 | 覆盖 FR/D | 说明 |
|---|---|---|---|---|---|---|
| task-01 | collectProbe8DiffFiles | W1 | P0 | — | FR-01, D-001 | diff 源三态 fallback+文件分类+design 差集；部件：_readWorktreeMeta+gitQuiet 自建（零新增 import） |
| task-02 | extractFrontendPayloadFields | W2 | P0 | task-01 | FR-02, D-002 | 三后缀提取+请求邻近窗口+URL 段边界关联+escape hatch+归一 |
| task-03 | extractBackendFields | W3 | P0 | task-01 | FR-02, D-003 | 两趟：Controller @RequestParam 修正正则+必填三形态+二趟全仓 DTO 解析+非 Java 跳过 |
| task-04 | comparePayloadFields+骨架子段 | W4 | P0 | task-02, task-03 | FR-02, FR-03, D-004, D-006 | 纯函数对账（漂移含行号/漏发）+渲染 advisory 档+不误中锚点 |
| task-05 | runProbe8 接线 | W5 | P0 | task-01, task-04 | FR-01 | collectProbe8DiffFiles 替换 parseFileChangeListDetailed 调用点:401+模式注记 |
| task-06 | 测试补全 | W6 | P0 | task-01~05 | 全 FR | NEW probe8-direct-compare（~35）+ 既有 probe8 两文件适配 |

## 关键路径
task-01 → task-02 → task-03 → task-04 → task-05 → task-06（03 为 04 的并行支链，同文件串行化后并入主链）

## 全局硬约束（据 design.md 汇编）
1. ESM 零新依赖；正则本地实现不引 AST
2. verify-probes 零新增 import 边（_readWorktreeMeta/gitQuiet/parseRepoRegistry 均在现有面）
3. advisory 档不阻断；既有 design 契约面零改动；probe1-7/9 不动
4. escape hatch probe8-skip 双侧（前端+后端）
5. 跨平台：ASCII 正则+utf8 读取；unquoteGitPath 归一
6. 实现期留意（Grill F-6）：数组类型 @RequestParam 方括号边界+全仓 grep 扫描上限（如限 src/ 目录递归+文件大小 cap）

## 全局验收标准
1. 定向测试全绿（两新文件+既有适配）+ lint 绿（全量留 CI）
2. diff 源三态正确；@RequestParam 三态提取正确；URL 段边界匹配正确
3. advisory 不阻断；渲染行不误中 verify-postcheck PROBE8 系锚点
4. 非 Java 变更零 warning 零阻断；escape hatch 双侧生效

## 覆盖矩阵
| ID | 覆盖任务 |
|---|---|
| D-001@v1 | task-01, task-05 |
| D-002@v1 | task-02, task-04 |
| D-003@v1 | task-03, task-04 |
| D-004@v1 | task-04 |
| D-005@v1 | （边界） |
| D-006@v1 | task-04 |
