---
author: qinyi
created_at: 2026-09-18 08:10:00
---

# 提案书（Proposal）

## 动机

EHS 复盘的 5 个 P1 中 3 个是前后端字段错位（P1-1 表单字段名≠实体名致支线全灭 / P1-2 缺发必填致开立必拒 / P1-6 NOT NULL 漏发致严格模式炸库）——这类缺陷长在代码与代码的缝隙里，声明面对账天然盲。批次 C（v3.28.12）交付了运行时地板（smoke+矩阵），本批补**静态直比面**——probe8 从「声明面对账」升级为「声明面+代码直比」双维度。

## 关键问题

1. probe8 文件源取 design 清单（声明面）——清单漏写/路径错时探针静默失明
2. 前后端代码级字段名错位无机械防线——字段漂移/必填漏发靠人眼
3. 后端必填面在 Controller/DTO/校验三层分散，无机械提取

## 变更范围

- probe8 diff 源替换（worktree diff 实际面+三态 fallback+design 差集 advisory）
- 前端 payload 构造点提取（三后缀+请求邻近窗口）+ URL→端点段边界关联
- 后端 Java 两趟提取（Controller 端点+@RequestParam 修正正则+必填三形态 + 全仓 DTO/实体解析兜底）
- 对账纯函数（漂移嫌疑含行号+必填漏发嫌疑）+ 骨架 direct-compare 子段 advisory 渲染
- 文件分类规则（后缀+目录启发式+.vue 无条件 frontend）

## 不在范围内

- 类型形状比对 / DSL 深度解析 / 非 Java 后端 / 硬门升格 / probe8 既有契约面改动 / AST 依赖

## 成功标准

- diff 源三态 fallback 正确（worktree/in-place 含已提交/design-list）
- 漂移嫌疑 warning 含文件:行号:字段；必填漏发嫌疑含端点:字段:前端文件
- @RequestParam 三态提取正确（参数名/required=false 排除/value 注解名）
- URL 段边界后缀匹配（/orders 命中 /api/v1/orders 不误命中 /rporders）
- escape hatch 双侧 + 非 Java 跳过 + 命中统计攒证
- 定向测试全绿+lint 绿（全量留 CI）
