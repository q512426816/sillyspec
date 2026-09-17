---
author: zcode-feedback-hardening-20260917
created_at: 2026-09-17
plan_level: light
---

# 轻量计划（Light Plan）：docs 引用锚方括号路径支持 + 陈旧基线自动重锚

## 来源
brainstorm design.md 两 Phase（proposal 方案 A/A）：Phase A = D-001@v1 方括号段并列形态（D-006@v1 展开循环约束保持）；Phase B = D-002@v1 陈旧基线自动重锚（checkOpts 四键守卫 + 披露）。Design Grill independent pass（CC-1~12 闭环，4 条修正已吸收）。任务清单见 tasks.md（5 任务两独立链 01→03、02→04、05 收尾），execute 合成隐式单 Wave 串行执行。

## 范围
- src/docs-check.js（REF_RE/SYMBOL_REF_RE 迭代体括号段并列 + 头注）
- src/docs-gate.js（runDocsGate 陈旧分支自动重锚 + checkOpts 守卫 + reanchored 返回面 + 头注）
- test/docs-fix-capability.test.mjs（方括号用例组）
- test/docs-gate.test.mjs（自动重锚用例）
- docs/sillyspec/interface-contract.md（§1.3b 镜像）

## 验收
- `collectDocRefs` 提取 `app/post/[id]/page.tsx:12` 全量（file 含方括号字面量）；方括号目录 fixture 真实校验层1+层2 通过
- 陈旧态（基线<远端实测 且 current≤实测 且无 checkOpts 覆盖）跑 gate：基线文件落盘为 current、消息含「已自动重锚」、返回 reanchored:true；第二次跑走快路径零远端实测；--paths 传入时不写盘
- markdown 链接/checkbox/脚注/嵌套提取行为与旧正则逐字节一致（回归用例锁死）
- npm test EXIT=0；npm run lint 绿；本仓 docs check 零新失效

## 覆盖矩阵
| ID | 覆盖任务 | 验收证据 |
|---|---|---|
| D-001@v1（方括号段=完整括号对并列形态） | task-01, task-03 | 验收1/3（全量提取+回归锁死） |
| D-002@v1（自动重锚+四键守卫） | task-02, task-04 | 验收2（落盘/快路径/守卫） |
| D-003@v1（非复潮声明） | task-02 | 实现面零新增 flag/模式 |
| D-006@v1（展开循环形，沿用约束） | task-01, task-03 | 验收3（ReDoS evil 方括号形 <100ms） |
| FR-01 | task-01, task-03 | 验收1/3 |
| FR-02 | task-02, task-04 | 验收2 |
| FR-03 | task-03, task-04, task-05 | 验收4 |

## 全局硬约束（从design.md逐字抄录，绑定所有task）
- 纯 Node 内置模块零依赖（docs-check 既有红线），不引 glob/escape 库。
- 正则改动必须保持展开循环形（D-006@v1）；禁止原子序列形。
- gate 语义变更不得触碰：首次立线 fail-closed、快路径零远端成本、真增量拦截文案。
- 测试全 tmp fixture（mkdtempSync），Windows 兼容（join/CRLF 显式）。
- 版本底线：Node >=22.13.0（package.json engines）。
