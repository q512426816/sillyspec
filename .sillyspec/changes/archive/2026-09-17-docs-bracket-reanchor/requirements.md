---
author: zcode-feedback-hardening-20260917
created_at: 2026-09-17
generated_by: agent
change: 2026-09-17-docs-bracket-reanchor
---
# 需求规格（Requirements）

## 角色
| 角色 | 说明 |
|---|---|
| agent（执行者） | 在文档中书写 file:line / file::symbol 引用锚的 AI 代理与人类开发者 |
| CLI 门禁 | docs check（引用校验）与 docs gate（ratchet 基线门），pre-push 第三道关 |
| 用户 | Next.js 项目 + 多会话共享仓的开发者，方括号路径不可精确引用与陈旧基线反复提示的直接受害者 |

## 功能需求

### FR-01: 引用锚方括号段语法（Next.js 动态路由 [id]/[cid]）
Given 文档中出现方括号路径引用（如 `app/post/[id]/page.tsx:12`、`app/chat/[cid]/route.ts:5`、`app/[lang]/layout.tsx::exportName`）
When collectDocRefs 提取（REF_RE 行号式 / SYMBOL_REF_RE 符号式）
Then 方括号段与既有圆括号段（路由组 `(dashboard)`）同权全量提取：文件段展开循环迭代体接受「完整圆括号对」或「完整方括号对」（对内字符类不变），提取结果 file 含方括号字面量
And resolveCandidates 对方括号路径照常解析（join+existsSync 字面量语义，无 glob 转义）；校验链层1/层2/fix/suggest 对方括号引用与普通引用同权
And markdown 链接 `[t](foo.js:12)` 零回归（`[t]` 段后遇 `(` 无法接扩展名，回落 `foo.js:12`）；嵌套 `[[x]]` 不匹配（与既有圆括号嵌套部分提取行为同族，无新增误报面）；`[...slug]` 捕获全路由因含 `...` 照旧走 FR-1.2 模糊跳过
And ReDoS 防护保持：展开循环形不变（迭代体必含完整括号对→划分唯一→线性），新增方括号 evil 用例锁死（D-006@v1 约束）

### FR-02: docs gate 陈旧基线自动重锚
Given 基线文件存在且 current > baseline，且 origin/main 实测成功且 current ≤ 实测值（本次不劣于远端）
When runDocsGate 走陈旧分支放行
Then 自动 writeBaseline(specBase, current) 落盘 + 消息披露重锚事实（含旧基线、新基线、远端实测 ref 与值、依据「已实测不劣于远端」），返回结构含 reanchored: true 与新基线值
And 守卫：仅缺省配置口径触发——checkOpts 显式传 paths/skip（CLI --paths 覆盖等子集口径）时不写盘，仅维持旧提示文案（防子集计数污染全口径基线）
And 首次立线路径不变（无基线仍 exit 2 要求显式 --init-baseline）；快路径（current ≤ baseline）零变化零远端实测；真增量分支（current > 实测值）拦截图文不变
And 后续同态运行回快路径（current ≤ 新基线），陈旧提示与远端实测成本各只发生一次

### FR-03: 测试与文档镜像随行
Given FR-01~02 行为变更
When 收尾
Then 新增/更新直测：docs-fix-capability.test.mjs 补方括号段提取（全量/段首/多段混合/markdown 链接回归/嵌套不匹配/ReDoS evil 方括号形）+ 真实校验 fixture（方括号目录落盘后层1+层2 通过）；docs-gate.test.mjs 补自动重锚（落盘值/消息披露/返回面）、--paths 覆盖守卫（不写盘）、快路径与真增量分支不变；文档镜像同步（docs/sillyspec/interface-contract.md §1.3b gate 语义补自动重锚行为与守卫边界）

## 验收标准
- 用户两负面场景逐一可复现修复：①文档写 `app/post/[id]/page.tsx:12` 精确引用可提取可校验（文件存在+行界+关键词断言全链路），不再依赖 `...` 模糊逃逸；②基线 404 < 远端 414 的陈旧态跑 gate，一次后基线文件重锚为本次实测值、消息披露、第二次跑 gate 走快路径零远端成本
- 存量零回归：无方括号引用的提取结果逐字节不变；markdown 链接/路由组圆括号/符号锚/repo:// 跨仓行为不变；gate 快路径、真增量拦截图文、--init-baseline 幂等语义、无基线 fail-closed 均不变
