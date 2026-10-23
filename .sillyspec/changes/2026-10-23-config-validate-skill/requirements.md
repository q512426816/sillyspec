---
author: flow-machine-draft
created_at: 2026-10-23T01:30:19.883Z
---
# 需求规格（Requirements）— 2026-10-23-config-validate-skill

## 功能需求

### FR-01: sillyspec config validate 逐键校验命令

- 新子命令 `sillyspec config validate [--json]` MUST 经 config-cat 权威路径链（resolveLocalYaml，worktree 感知）解析 local.yaml：YAML 解析失败 MUST 判错误 exit 1；在场键 MUST 按 config-schema 单一源逐键校验（类型 string/number/boolean/enum 取值域；段内必填键如 mcp.url/token 段在场而缺键=错误）；未知顶层键（非 schema 段 id 亦非根级已知键）MUST 判警告；deprecated 状态键在场 MUST 判 info 提示；local.yaml 不存在 MUST 判 info「零配置可用」exit 0（零配置契约锚）；人类渲染与 --json MUST 同判定同退出码（0=通过可含警告，1=有错误）。

#### 场景：坏类型错误

Given local.yaml 含 commands.test_timeout_sec: "abc"（string 而非 number）；When validate；Then 错误 exit 1，输出点名键与期望类型。

#### 场景：段内缺凭据

Given mcp 段有 url 无 token；When validate；Then 错误 exit 1 点名缺键。

#### 场景：缺文件零配置

Given local.yaml 不存在；When validate；Then info 提示零配置可用 exit 0。

### FR-02: sillyspec-config 引导技能（末步硬门=validate）

- 新技能 `.claude/skills/sillyspec-config/SKILL.md`（随 init 分发面同源）MUST 包含：①首节「默认零配置可用」契约陈述与必填场景决策表（仅平台凭据/跨仓注册/lint 收口等真需要仓主知识的键）②探测流程（config cat 看现状 → 按决策表探测仓结构 package.json/pyproject/Makefile → 只写需要的键，示例逐键照抄 schema example）③末步硬门：`sillyspec config validate` 必须 exit 0 才算配置完成，失败按输出修复、禁止跳过验证宣称完成。

#### 场景：技能硬门锚

Given 技能文件在场；Then 含「config validate」与「必须通过/exit 0 才算完成」硬门表述与决策表。

### FR-03: 帮助面与数据源消费原则（执行期扩展：补登未注册键）

- config help 文案 MUST 列 validate 子命令；校验 MUST 只消费 schema 不生产。执行期修订（dogfood 实证）：config-schema 发现面存在历史欠账——本会话 5 键（turbo/review_inline_wait/dirty_gate_ignore/module_gate_ignore/fr_regress_cap）与仓实际在用的 repos 跨仓注册表、fr_unmapped_baseline 均未注册，照原口径校验会把工具自身宣传/在用的键报「未知」——本变更 MUST 补登这 7 键（注册面新增，校验器零改动跟随）并同步 example 模板 token（防漂耦合测试）；校验器 MUST 支持 review_probes 列表-of-对象形态（本仓真实配置形态，旧映射建模误报）。

#### 场景：help 列新命令

Given sillyspec config help；Then 输出含 validate 行。

#### 场景：本仓 dogfood

Given 本仓真实 local.yaml（含 review_probes 列表/repos/fr_unmapped_baseline）；When validate；Then exit 0、零未知键警告（commands.test deprecated info 属合法）。

### FR-04: 测试矩阵

- 新增测试 MUST 覆盖：校验函数 unit（好配置过/坏类型错/未知键警/段内缺凭据错/空文件过/缺文件 info 过/deprecated info/enum 越界错）＋CLI e2e（--json 双态与退出码 0/1）＋技能文件存在性与硬门文案锚。

#### 场景：矩阵

Given 直调与 CLI 各形态；When 分别执行；Then 断言各自成立。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/config-validate.test.mjs「①校验函数 unit 八态」「②CLI e2e --json 双态与退出码」
FR-02: test/config-validate.test.mjs「③技能文件存在性与硬门文案锚」
FR-03: test/config-validate.test.mjs「④config help 列 validate 行（源码锚）」
FR-04: test/config-validate.test.mjs「①-④」
