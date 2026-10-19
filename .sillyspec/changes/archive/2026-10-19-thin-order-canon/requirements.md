---
author: flow-machine-draft
created_at: 2026-10-19T06:00:38.189Z
---
# 需求规格（Requirements）— 2026-10-19-thin-order-canon

## 功能需求

### FR-01: 正典顺序句在 flow start 横幅（【你要做的】与三断点纪律）、adopt 收编横幅、flow done 未批准拦截、flow approve 输出面一致落位；全仓「动码前后顺手作答」「写码前后顺手填」「干活时作答」类许可后补的措辞清零

- flow start 新建横幅的「【你要做的】」行动句必须以正典顺序表述（先答 spec 面 → 断点① 批准 → 才动码），禁止再以「直接干活：改代码、写测试」作为首行动指令；三断点纪律块标题必须标注「①未过不动码」的顺序语义。
- adopt 收编横幅、flow done 未批准拦截文案、flow approve 成功输出三面必须把批准表述为「动码前置义务」而非收口动作；autopilot 必须表述为「用户显式豁免，非 agent 自选补救」。
- 禁止 src/ 与 assets/ 任何输出面出现「动码前后顺手」「写码前后顺手」「干活时作答」类许可后补的措辞；恢复简报必须显示 spec 批准状态（已批准含 channel / 未批准提示先补批）。

#### 场景：主路径（横幅顺序句）

Given 全新轻量变更 flow start，When 读取横幅，Then「【你要做的】」首句含「先答 spec 面」且顺序为 spec → 批准 → 动码；grep src/ 与 assets/ 无「顺手作答 / 顺手填」字样。

#### 场景：未批准收口拦截

Given 未批准变更运行 flow done，When 拦截输出，Then 文案含「批准是动码前置」语义并给出补批通道，autopilot 出口标注须用户显式授权。

#### 场景：恢复简报带批准状态

Given 未批准变更重跑 flow start 恢复，When 读取恢复简报，Then 含批准状态行；未批准时「下一步」指向补批而非「继续干活」。

### FR-02: assets/command-cards/flow.md 与 .claude/skills/sillyspec-flow/SKILL.md 的生命周期改为「flow start → 补 spec 面 → 批准 → 干活 → flow done」，含 approve 环节

- 命令卡步骤面与 SKILL.md description 及正文的生命周期必须统一为「flow start → 补 spec 面（FR 绑定+design 四节）→ 批准（flow approve / --autopilot）→ 干活 → flow done」；两文件必须出现 flow approve 环节字样。
- SKILL.md 必须把「先答 spec 面（动码前）」拆为独立小节置于「干活」小节之前，design 四节与 FR 绑定的期限必须表述为「动码前」而非「flow done 拒收前补」。

#### 场景：生命周期一致

Given 本变更合入后的两文件，When 读取步骤/生命周期段，Then 均含「批准」环节且顺序为 spec → 批准 → 干活；描述行不再以「直接干活（改代码写测试）」概括第②步。

### FR-03: flow status：未批准且非 autopilot 时相位停在「① spec（→ 待用户批准）」并给提示，--json 增 specApproved 字段

- flow status 相位推断在 spec_approved ≠ true 且 autopilot ≠ true 时必须停在「① spec」段并输出待批准提示；已批准或 autopilot 时必须进入执行段并在文案标注（已批准 / autopilot 豁免）。
- flow status --json 输出必须含 specApproved 布尔字段，已批准时附带 channel；字段为增量新增，禁止移除既有键。

#### 场景：未批准

Given 未批准且非 autopilot 的变更，When flow status，Then 相位文本含「待用户批准」提示，JSON specApproved=false。

#### 场景：已批准

Given flow approve 已运行的变更，When flow status，Then 相位进入执行段且含「已批准」标注，JSON specApproved=true。

### FR-04: templates/agents-instruction.md 选道行与规则 3 补轻量道顺序句，本仓 AGENTS.md/CLAUDE.md 同步，package.json 版本号提升使消费仓重跑 init 可取新资产

- templates/agents-instruction.md 轻量道选道行必须改为含「补 spec 面+批准」的链式表述；规则 3 必须补「轻量道即：FR 绑定+design 四节+批准先于动码（读代码不算动码）」语义。
- 本仓 AGENTS.md 与 CLAUDE.md 对应行必须同步为同义表述；package.json version 必须从 3.33.1 提升（3.34.0）。

#### 场景：模板与仓内一致

Given 本变更合入后，When 比对模板与 AGENTS.md/CLAUDE.md 轻量道行，Then 三者顺序表述同义且均含批准环节；package.json version 高于 3.33.1。

### FR-05: 既有测试锚（flow-checkpoints/flow-redline-frontload/flow-clarity-probe/governance-autopilot/tdd-scope-guidance 等）同步更新，全量测试绿

- 受措辞影响的既有测试锚必须同步更新为断言新文案；新增 test/flow-order-canon.test.mjs 覆盖 FR-01~FR-04 断言；全量测试必须绿。

#### 场景：全量回归

Given 本变更全部合入，When 跑全量测试，Then 零失败。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/flow-order-canon.test.mjs「横幅/adopt/done/approve/恢复简报五面正典句一致与顺手措辞清零」
FR-02: test/flow-order-canon.test.mjs「命令卡与 skill 生命周期含批准环节」
FR-03: test/flow-order-canon.test.mjs「status 未批准相位停在 spec 与 specApproved 字段」
FR-04: test/flow-order-canon.test.mjs「模板与本仓 AGENTS/CLAUDE 同步及版本提升」
FR-05: 不适用：FR-05 本身是全量回归面——锚更新落在 FR-01~04 用例与既有锚文件内，全量绿由 flow done 实测门亲自执行覆盖
