---
author: flow-machine-draft
created_at: 2026-10-05T14:48:26.336Z
---
# 需求规格（Requirements）— 2026-10-05-input-teach-copyable

## 功能需求

> FR 由你撰写：每条 = `### FR-NN: 标题` + 一句带强度词的行为规定（必须=硬性；禁止=红线；
> SHOULD=建议须注理由；可以=可选）；边界情形加场景块 `#### 场景：名` + Given/When/Then 行。
> 标题行是成功标准锚（勿改写——收口做门柱对比）；正文与场景块归你。

### FR-01: src 全仓 7 处分号内联教学形态零残留，各教学处给出含「成功标准：」独立行与「- <可验证标准>」条目行的可照抄多行实例

src 中禁止残留分号内联教学形态 `--input "<动机与背景；随后独立一行『成功标准：』；再每行一条『- <可验证标准>』>"`；实测定位的 7 处教学点（src/run/command.js status 空态、src/flow.js 变更名重试提示、src/index.js quick 退役引导、src/hooks/worktree-guard.js 三处 stage 提示、src/stages/brainstorm.js 转轻量建议）必须改为含真实换行的可照抄实例——实例含 `成功标准：` 独立行与 `- <可验证标准>` 条目行；src/flow.js 清晰度门 ② 引导与 flow 用法行同步给出同口径实例/说明。零残留断言若新抓到残留点（实测抓到 command.js 两处、stage.js 一处）同标准一并修复。

#### 场景：主路径

- Given：agent 从任一 CLI 教学输出（status 空态 / hook 提示 / 拒收引导）照抄实例命令
- When：以照抄的 `--input` 值运行 flow start
- Then：extractSuccessCriteria 提取 ≥ 1 条成功标准，清晰度门放行（不再 exit 2）

#### 场景：缩进容忍

- Given：教学实例带展示缩进（行首空格）
- When：照抄时连缩进一起传入 --input
- Then：行级 trim 后仍过门（extractSuccessCriteria 逐行 trim，flow-draft.js:133）

### FR-02: design 模板教学措辞显式说明问题行原样保留（勿删勿改勿替换）、答案另起一行写在问题行下方

src/flow-draft.js 的 design 模板教学注释必须显式说明：四问问题行/节标题原样保留，勿删勿改勿用答案替换；答案另起一行写在问题行下方。措辞须覆盖「整块替换问题原文」失败模式（2026-10-05-flow-help-status 三度实证），锚文本（四问原文、节标题）不得随本变更改动。

#### 场景：主路径

- Given：agent 按 flow start 生成的 design.md 模板教学填答
- When：agent 在问题行下方插入答案段落（问题行未动）
- Then：flow done artifacts 锚对比通过，无「问题文本被改写」拒收

### FR-03: 测试锁定：分号形态零残留断言 + 教学实例组成部分在场断言 + 实例核心形态喂 extractSuccessCriteria 提取大于等于 1 条断言

必须新增测试文件锁定 FR-01/FR-02：① src 全仓分号内联形态零残留断言；② 各教学处实例组成部分（`成功标准：` 独立行、`- <可验证标准>` 条目行）在场断言；③ 实例核心形态（`<动机>\n\n成功标准：\n- <条目>`）喂 extractSuccessCriteria 断言提取 ≥ 1 条。

#### 场景：主路径

- Given：本变更已合入
- When：运行新增测试
- Then：三条断言全过；若分号形态回流或实例形态改坏到不可提取，测试失败

### FR-04: 相关测试全部通过（含 input-format-copy 教学点断言同步更新）

本变更触达的测试面必须全部通过；test/input-format-copy.test.mjs 的教学点断言（② 教学点均带『独立一行『成功标准：』』教学）必须随教学形态升级同步为锁新实例形态（教学从「描述式字样」升级为「可照抄实例」，旧断言字样随形态消失）。

#### 场景：主路径

- Given：7 处教学已改为实例形态，input-format-copy 断言已同步
- When：运行本变更测试集（新增测试 + input-format-copy + flow/help 相关回归）
- Then：全部 pass

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/input-teach-copyable.test.mjs「分号内联教学形态零残留」「各教学处带可照抄实例」
FR-02: test/input-teach-copyable.test.mjs「design 模板锚教学防替换措辞」
FR-03: test/input-teach-copyable.test.mjs「教学实例核心形态可提取成功标准」
FR-04: test/input-format-copy.test.mjs「教学点断言同步（锁新实例形态）」、test/input-teach-copyable.test.mjs 全量
