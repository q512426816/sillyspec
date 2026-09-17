---
author: zcode-feedback-hardening-20260917
created_at: 2026-09-17
generated_by: agent
change: 2026-09-17-docs-bracket-reanchor
scale: large
---
# 设计文档（Design）— 2026-09-17-docs-bracket-reanchor

## 背景

用户 2026-09-17 工具使用小结负面两条：

1. **方括号路径不可精确引用**：`REF_RE`（src/docs-check.js:125）与 `SYMBOL_REF_RE`（src/docs-check.js:174）文件段只认圆括号段（路由组，2026-09-08-docs-fix-capability D-006 落地），Next.js 动态路由 `app/post/[id]/page.tsx` 类引用无法提取，全仓只能 `...` 模糊逃逸（skippedFuzzy 跳过校验，引用零核验）。
2. **陈旧基线提示反复出现从不落盘**：docs gate 陈旧分支（src/docs-gate.js:189-199，坑 docs-gate-stale-baseline ql-20260915-004）已实付远端实测成本（临时 worktree + 全量 docs check）验证「本次不劣于远端」后放行，但基线文件不重锚——同态下每次跑 gate 重复提示 + 重复远端实测。用户实证：基线 404 < 远端 414 反复出现。

正面项（棘轮拦截 36 处失效、`--against HEAD` 提交树校验隔离并行会话）验证了机制有效性，不属修复面。

## 设计目标

1. 方括号段与圆括号段在引用锚语法里同权：可提取、可解析、可校验（层1/层2）、可 fix/suggest。
2. 已验证事实落盘：陈旧分支的远端实测结论自动回流基线文件，提示出现一次即消失。
3. 存量行为零回归（无方括号引用逐字节不变；gate 快路径/真增量/首次立线语义不变）。

## 非目标

- 不做 glob 语义路径引用（`*` 通配路径）——`...` 模糊逃逸与豁免机制已覆盖。
- 不改 walkGlob（文档扫描 glob）对方括号目录的支持面——文档路径极少含方括号，遇到时按字面路径直传已可用。
- 不做「基线陈旧主动检测/后台重锚」——只在 gate 运行走到陈旧分支时顺带落盘，不新增触发时机。
- 不改 `--init-baseline` 显式语义与 fail-closed 首次立线红线。

## 拆分判断

单变更两 Phase（同模块 docs-consistency、同源反馈、共享测试与文档收尾）：Phase A = FR-01 语法扩展；Phase B = FR-02 重锚。互不依赖可并行，测试分文件不冲突。

## 总体方案

### Phase A：文件段括号段并列（src/docs-check.js）

`REF_RE`/`SYMBOL_REF_RE` 共用的文件段展开循环，迭代体从单一圆括号段改为圆/方并列：

```
旧：[类]*(?:\([类]+\)[类]*)*\.ext
新：[类]*(?:(?:\([类]+\)|\[[类]+\])[类]*)*\.ext     （类 = [A-Za-z0-9_.\-\/]）
```

- **线性保持（D-006@v1）**：迭代体必含完整括号对（`(`+类+`)` 或 `[`+类+`]`，开闭同形），每次迭代有唯一划分锚 → 无灾难回溯；不做 `(?:A+|B+)+` 原子序列形。
- **markdown 链接零回归**：`[t](foo.js:12)` 的 `[t]` 匹配方括号段后，normal* 遇 `(` 截止，扩展名组要求 `.` 失败 → 回落 `foo.js:12`（与圆括号段在同场景的回落机理一致，docs-fix-capability 已锁用例补方括号变体）。
- **嵌套行为（Grill CC-4 修正）**：`[[x]]`/`[[...slug]]` 内容含 `[` 不属类 → 方括号段不成立，新旧正则对此类文本均部分提取尾部残段（如 `/page.tsx:1`，逐字节一致、无新增 invalid 面）；可选捕获全路由不走精确引用，单层 `[...slug]` 可全量提取但含 `...` 走既有 FR-1.2 模糊跳过——测试断言锁「与旧正则行为一致」而非「零提取」。
- **解析零改动**：resolveCandidates 的 join+existsSync 是字面量语义（无 glob），`app/post/[id]/page.tsx` 直拼即命中真实目录；findInTree 精确名匹配同理。applyFixes 按 ref 串定点替换与字符集无关。
- **散文误报面**：形如 `arr[0].js:12` 的散文新进入提取面（旧正则同样不匹配该文本整体，但也不产生失效；新正则提取后若文件不存在产生一条失效）——与圆括号扩展当年接受的 `f(x).js` 同级风险，docs gate 棘轮只拦增量，误报可 `?` 纯位置锚或改写消解。

### Phase B：陈旧分支自动重锚（src/docs-gate.js）

`runDocsGate` 陈旧分支（`measured.originCount !== null && current <= measured.originCount`）：

1. **口径守卫（Grill CC-5/CC-9 修正）**：守卫拦的是 `checkOpts` 一次性子集覆盖——`checkOpts.paths || checkOpts.skip || checkOpts.keywordAssert != null || checkOpts.crossRepoRoots` 任一显式传入时不写盘（子集/异口径计数写盘会错调基线）。**不拦** local.yaml 持久口径：measureRemoteBaselineCount 与本地 current 每次同读该配置（src/docs-gate.js:113? 与 src/docs-gate.js:165，论述语境纯位置锚+守卫合并调用锚），读写恒同口径自洽——若误拦 cfg 层，本仓（local.yaml skip 非空）自动重锚将永不触发。守卫下维持现状提示文案（手动 `--init-baseline` 建议）。
2. **落盘**：守卫通过时 `writeBaseline(specBase, current)`，消息从「建议 sillyspec docs gate --init-baseline 重锚锁定」改为「📌 已自动重锚 基线 404→410（实测不劣于 origin/main 414，已落盘锁定）」。
3. **返回面**：结果对象增 `reanchored: boolean`（缺省 false，其余分支不变），`--json` 消费者可机械判定。
4. **红线核对**：「不悄悄合法化存量」约束的是首次立线（无基线不自动生成）；自动重锚仅在基线已存在且本次已实测不劣于远端时触发，新基线 = 本次实测值 ≤ 远端实测值——棘轮只紧不松（相对旧基线数值上变大，但每一分增量都已被远端实测背书，与「ratchet 本质=拦增量」一致）。写面仅基线文件一处，消息披露非悄悄。

## 文件变更清单

| 文件 | 动作 | 说明 |
|---|---|---|
| src/docs-check.js | MODIFY | REF_RE/SYMBOL_REF_RE 迭代体括号段并列 + 头注补方括号说明（:106-125、:168-174） |
| src/docs-gate.js | MODIFY | runDocsGate 陈旧分支自动重锚 + 口径守卫 + reanchored 返回面 + 头注（:189-209） |
| test/docs-fix-capability.test.mjs | MODIFY | 方括号段提取用例组（含圆方混合段 `app/(g)/[id]/z.tsx:3`——并列形态直接验证点 + `[...slug]` 单层 fuzzy-skip 消误报用例，Grill CC-11）+ markdown 方括号链接回归 + 嵌套文本「与旧一致」断言（CC-4）+ ReDoS evil 方括号形 + 真实校验 fixture |
| test/docs-gate.test.mjs | MODIFY | 自动重锚落盘/披露消息/返回面 + --paths 守卫不写盘 + 快路径/真增量/首次立线不变回归 |
| docs/sillyspec/interface-contract.md | MODIFY | §1.3b 补自动重锚行为与守卫边界一行 |

## 接口定义

- `collectDocRefs`/`SYMBOL_REF_RE` 对外契约不变（返回对象字段零增减）；`file` 字段值域扩至可含 `[`/`]` 字面量。
- `runDocsGate` 返回对象新增 `reanchored: boolean`（缺省 false，其余分支不变）；重锚分支 `baseline` 字段返回新基线值（= current，与 `--init-baseline` 分支返回形态一致，Grill CC-12 拍板）。既有消费方 index.js 透传 message/exitCode 不受影响；--json 读者向后兼容——新增字段。

## 数据模型

基线文件 `.sillyspec/docs-check-baseline` 格式不变（纯数字一行）；本变更换其写入时机（陈旧分支自动写），不换格式。

## 兼容策略（brownfield 必填）

- 语法扩展是提取面超集：既有文档中不含方括号的引用提取结果逐字节不变；含方括号文本此前要么不提取（零行为差）要么以残段提取（如 `foo.js:12` 部分）——扩展后整体提取，若产生新失效由棘轮基线拦增量（本仓基线内自查收口，见风险登记 R-2）。
- gate 写时机变化对 pre-push hook（`.husky/pre-push` 跑 `docs gate`）透明：exit code 语义不变（该分支原就 exit 0）。

## 风险登记

| # | 风险 | 缓解 |
|---|---|---|
| R-1 | 方括号扩展让散文偶然文本（`arr[0].js:12` 类）新进校验产生误报 | Grill CC-10 实测：旧正则对此类文本已提取残段（`.js:12`，大概率 invalid），新版全量提取——invalid 计数 1→1 不变，方向从「残段误报」变「全量可定位」，无净增面；用例锁 markdown 链接/嵌套一致；`?` 纯位置锚/改写消解；棘轮拦增量 |
| R-2 | 本仓文档若已有方括号伪引用文本，扩展后 docs gate 自测超基线 | execute 后实跑 `npm test` + `node bin/sillyspec.js docs check` 全量自查，新失效在本变更内消化 |
| R-3 | 自动重锚与并行会话同时写基线竞态 | 写面单文件小整数、双方写的都是已验证不劣于远端的值，last-write-wins 无害 |
| R-4 | `--against HEAD` 模式下 current 为提交树计数，重锚落盘该值与工作区口径有瞬差 | 与 `--init-baseline --against` 既有语义一致（同写提交树实测值），不新增口径 |

## 决策追踪

| 决策 | 来源 | 状态 |
|---|---|---|
| REF_RE 展开循环形（原子序列形 ReDoS 否决） | knowledge/decisions/docs-consistency.md D-006@v1 | 沿用——迭代体并列括号段形态不破坏线性 |
| docs-fix-capability D-001「gate --delta-only 不做（YAGNI 等第二次批量事件）」 | 同库 D-001（docs-fix-capability 段） | 非复潮——本变更非 delta-only 门；用户实证陈旧提示反复出现即该留账等候的批量事件 |
| 首次立线须显式 --init-baseline（不悄悄合法化存量） | docs-gate.js 头注/interface-contract §1.3b | 保持——自动重锚仅限基线已存在且已实测不劣于远端的分支 |
| 新增：D-001@v1 方括号段=完整括号对并列形态（非字符类放宽）；D-002@v1 陈旧基线自动重锚（缺省口径守卫+披露） | 本变更 decisions.md | 落盘于 change decisions.md，归档时提炼 |

## 自审

1. **线性证明复核**：迭代体 `(?:\([类]+\)|\[[类]+\])[类]*`——每次迭代以唯一开括号字符起、以配对闭括号字符止，normal* 无括号字符 → 相邻迭代边界唯一，无跨迭代划分歧义（D-006 同论证）；evil 用例补方括号形（长 token 无 `:N`）锁 <100ms。
2. **误报面反例穷举**：markdown 链接 `[t](f.js:1)`（回落）、引用式 `[label]: url`（`:` 后无扩展名）、复选框 `- [ ] f.js:1`（空格不在类内不成立段）、表格/脚注 `[^1]`（`^` 不在类内）——逐一用例锁定。
3. **守卫完备性（Grill CC-9 修正后）**：守卫查 checkOpts 全部四键（paths/skip/keywordAssert/crossRepoRoots）——runDocsGate 透传面共这四键；CLI 唯一调用方 index.js 只传 paths/against（主径覆盖），编程调用方传任一异口径键都受保护；local.yaml 持久口径不拦（读写同源自洽）。
4. **消息兼容**：pre-push 只看 exit code，消息变更零影响；--json 读者新增 reanchored 字段向后兼容。
5. **Windows**：方括号目录名在 NTFS 合法（圆括号路由组 fixture 已实证同族路径）；路径拼接全部 join 无 shell 参与。

## 全局硬约束（绑定所有 task，冲突以本段为准并上报主代理）

- 纯 Node 内置模块零依赖（docs-check 既有红线），不引 glob/escape 库。
- 正则改动必须保持展开循环形（D-006@v1）；禁止原子序列形。
- gate 语义变更不得触碰：首次立线 fail-closed、快路径零远端成本、真增量拦截文案。
- 测试全 tmp fixture（mkdtempSync），Windows 兼容（join/CRLF 显式）。
- 版本底线：Node >=22.13.0（package.json engines）。
