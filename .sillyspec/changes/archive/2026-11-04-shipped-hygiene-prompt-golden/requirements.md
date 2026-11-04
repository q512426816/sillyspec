---
author: flow-machine-draft
created_at: 2026-11-04T07:23:35.750Z
---
# 需求规格（Requirements）— 2026-11-04-shipped-hygiene-prompt-golden

## 功能需求

### FR-01: 新增测试保证 templates/ 与 .claude/skills/ 无开发物料文件（CREATION-LOG/压力场景/测试脚本类命名）

- 仓库必须携带一个卫生测试：递归扫描 templates/ 与 .claude/skills/ 下的文件名，命中开发物料命名模式（CREATION-LOG*、*.test.[cm]js、test-*.mjs、含 pressure 字样）即必须判 FAIL 并列出文件清单——开发物料随交付面安装会被工作态 agent grep 到并当活指令执行（superpowers #2277 同型实证）。

#### 场景：主路径

- Given 当前 templates/ 与 .claude/skills/ 全部为交付物料，When 跑卫生测试，Then PASS。
- Given 任一目录被放入 `foo-pressure-scenario.md`，When 跑卫生测试，Then FAIL 且清单含该文件（负例用夹具临时文件在测试内自建自清验证）。

### FR-02: 新增测试对 10 个 stage definition 的步骤提示词序列做 sha256 金档比对，意外漂移红、显式再生成通道留痕

- 测试必须 import src/stages/ 下 10 个导出 definition 的阶段模块（brainstorm/plan/execute/verify/archive/explore/quick/scan/status/doctor），对其步骤（name+prompt）序列算 sha256，与仓内基线文件逐阶段比对；不一致必须 FAIL 并提示显式再生成通道（env SILLYSPEC_REGEN_PROMPT_GOLDEN=1 重写基线）——有意修改提示词时再生成即绿并使漂移在 diff 可见，意外漂移（误改/合并踩踏）直接红。

#### 场景：主路径

- Given 基线已生成，When 无提示词改动跑测试，Then 全阶段哈希一致 PASS。
- Given 人为篡改某阶段一个提示词字符，When 跑测试，Then 该阶段 FAIL 并给出再生成指引。

### FR-03: 新增测试全绿，既有回归面零破坏

- 本变更只新增测试与基线数据文件，不修改任何产品代码；落地后新增测试必须 PASS，既有测试面（收口推断面）必须零失败。

#### 场景：主路径

- Given 本变更落地，When 跑收口实测面，Then 零失败零超时。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/shipped-hygiene.test.mjs「交付面无开发物料（含负例夹具）」
FR-02: test/prompt-golden.test.mjs「stage 提示词金档哈希比对（含篡改负例与再生成通道）」
FR-03: test/shipped-hygiene.test.mjs + test/prompt-golden.test.mjs ＋收口 CLI 推断实测面（fail-closed）
